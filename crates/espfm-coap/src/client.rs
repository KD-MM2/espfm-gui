use std::net::SocketAddr;
use std::time::Duration;

use coap::request::{Method, RequestBuilder};
use coap::UdpCoAPClient;
use coap_lite::ResponseType as Status;
use prost::Message;

use crate::codec;
use crate::error::CoapError;
use crate::proto;
use crate::types::*;

const REQUEST_TIMEOUT: Duration = Duration::from_secs(3);

/// High-level CoAP client for the ESPFanManager device.
pub struct CoapClient {
    client: UdpCoAPClient,
}

impl CoapClient {
    /// Connect to a device at the given socket address.
    pub async fn new(addr: SocketAddr) -> Result<Self, CoapError> {
        let mut client = UdpCoAPClient::new(addr)
            .await
            .map_err(|e| CoapError::Unreachable(e.to_string()))?;
        client.set_receive_timeout(REQUEST_TIMEOUT);
        Ok(Self { client })
    }

    // ── Private helpers ──────────────────────────────────────────────

    async fn get(&self, path: &str) -> Result<Vec<u8>, CoapError> {
        let request = RequestBuilder::new(path, Method::Get).build();
        let response = self
            .client
            .send(request)
            .await
            .map_err(|e| map_io_error(e))?;
        check_status(&response)?;
        Ok(response.message.payload)
    }

    async fn post<M: Message>(&self, path: &str, msg: &M) -> Result<Vec<u8>, CoapError> {
        let data = codec::encode(msg)?;
        let request = RequestBuilder::new(path, Method::Post)
            .data(Some(data))
            .build();
        let response = self
            .client
            .send(request)
            .await
            .map_err(|e| map_io_error(e))?;
        check_status(&response)?;
        Ok(response.message.payload)
    }

    async fn put<M: Message>(&self, path: &str, msg: &M) -> Result<Vec<u8>, CoapError> {
        let data = codec::encode(msg)?;
        let request = RequestBuilder::new(path, Method::Put)
            .data(Some(data))
            .build();
        let response = self
            .client
            .send(request)
            .await
            .map_err(|e| map_io_error(e))?;
        check_status(&response)?;
        Ok(response.message.payload)
    }

    async fn delete(&self, path: &str) -> Result<Vec<u8>, CoapError> {
        let request = RequestBuilder::new(path, Method::Delete).build();
        let response = self
            .client
            .send(request)
            .await
            .map_err(|e| map_io_error(e))?;
        check_status(&response)?;
        Ok(response.message.payload)
    }

    // ── Fan endpoints ────────────────────────────────────────────────

    pub async fn get_fans(&self) -> Result<Vec<FanState>, CoapError> {
        let data = self.get("fans").await?;
        let list: proto::FanList = codec::decode(&data)?;
        Ok(list.fans.into_iter().map(FanState::from).collect())
    }

    pub async fn get_fan(&self, slot: u32) -> Result<FanState, CoapError> {
        let path = format!("fans/{}", slot);
        let data = self.get(&path).await?;
        let info: proto::FanInfo = codec::decode(&data)?;
        Ok(FanState::from(info))
    }

    pub async fn create_fan(
        &self,
        name: &str,
        pwm_gpio: u32,
        tach_gpio: u32,
        opts: FanCreateOpts,
    ) -> Result<FanState, CoapError> {
        let req = proto::FanCreateRequest {
            name: Some(name.to_string()),
            pwm_gpio,
            tach_gpio,
            mode: opts.mode.map(|m| m.into()),
            duty: opts.duty,
            source_id: opts.source_id,
            curve_id: opts.curve_id,
            schedule_id: opts.schedule_id,
            group_id: opts.group_id,
            inverted: opts.inverted,
            enabled: opts.enabled,
        };
        let data = self.post("fans", &req).await?;
        let info: proto::FanInfo = codec::decode(&data)?;
        Ok(FanState::from(info))
    }

    pub async fn update_fan(
        &self,
        slot: u32,
        req: &proto::FanUpdateRequest,
    ) -> Result<FanState, CoapError> {
        let path = format!("fans/{}", slot);
        let data = self.put(&path, req).await?;
        let info: proto::FanInfo = codec::decode(&data)?;
        Ok(FanState::from(info))
    }

    pub async fn delete_fan(&self, slot: u32) -> Result<(), CoapError> {
        let path = format!("fans/{}", slot);
        self.delete(&path).await?;
        Ok(())
    }

    // ── Source endpoints ─────────────────────────────────────────────

    pub async fn get_sources(&self) -> Result<Vec<TempSource>, CoapError> {
        let data = self.get("sources").await?;
        let list: proto::SourceList = codec::decode(&data)?;
        Ok(list.sources.into_iter().map(TempSource::from).collect())
    }

    pub async fn create_source(
        &self,
        req: &proto::SourceCreateRequest,
    ) -> Result<TempSource, CoapError> {
        let data = self.post("sources", req).await?;
        let info: proto::SourceInfo = codec::decode(&data)?;
        Ok(TempSource::from(info))
    }

    pub async fn update_source(
        &self,
        slot: u32,
        req: &proto::SourceUpdateRequest,
    ) -> Result<TempSource, CoapError> {
        let path = format!("sources/{}", slot);
        let data = self.put(&path, req).await?;
        let info: proto::SourceInfo = codec::decode(&data)?;
        Ok(TempSource::from(info))
    }

    pub async fn delete_source(&self, slot: u32) -> Result<(), CoapError> {
        let path = format!("sources/{}", slot);
        self.delete(&path).await?;
        Ok(())
    }

    pub async fn update_manual_temp(&self, id: u32, temp_c: f32) -> Result<(), CoapError> {
        let req = proto::ManualTempRequest { id, temp_c };
        self.post("sources/temp", &req).await?;
        Ok(())
    }

    // ── DS18B20 endpoints ────────────────────────────────────────────

    pub async fn scan_ds18b20(&self) -> Result<Vec<Ds18b20Device>, CoapError> {
        let data = self.get("ds18b20/scan").await?;
        let resp: proto::Ds18b20ScanResponse = codec::decode(&data)?;
        Ok(resp.devices.into_iter().map(Ds18b20Device::from).collect())
    }

    pub async fn config_ds18b20(&self, gpio: u32) -> Result<(), CoapError> {
        let req = proto::Ds18b20ConfigRequest { gpio };
        self.post("ds18b20/config", &req).await?;
        Ok(())
    }

    // ── Curve endpoints ──────────────────────────────────────────────

    pub async fn get_curves(&self) -> Result<Vec<CurveInfo>, CoapError> {
        let data = self.get("curves").await?;
        let list: proto::CurveList = codec::decode(&data)?;
        Ok(list.curves.into_iter().map(CurveInfo::from).collect())
    }

    pub async fn create_curve(
        &self,
        req: &proto::CurveCreateRequest,
    ) -> Result<CurveInfo, CoapError> {
        let data = self.post("curves", req).await?;
        let info: proto::CurveInfo = codec::decode(&data)?;
        Ok(CurveInfo::from(info))
    }

    pub async fn update_curve(
        &self,
        slot: u32,
        req: &proto::CurveUpdateRequest,
    ) -> Result<CurveInfo, CoapError> {
        let path = format!("curves/{}", slot);
        let data = self.put(&path, req).await?;
        let info: proto::CurveInfo = codec::decode(&data)?;
        Ok(CurveInfo::from(info))
    }

    pub async fn delete_curve(&self, slot: u32) -> Result<(), CoapError> {
        let path = format!("curves/{}", slot);
        self.delete(&path).await?;
        Ok(())
    }

    // ── Schedule endpoints ───────────────────────────────────────────

    pub async fn get_schedules(&self) -> Result<Vec<ScheduleInfo>, CoapError> {
        let data = self.get("schedules").await?;
        let list: proto::ScheduleList = codec::decode(&data)?;
        Ok(list.schedules.into_iter().map(ScheduleInfo::from).collect())
    }

    pub async fn create_schedule(
        &self,
        req: &proto::ScheduleCreateRequest,
    ) -> Result<ScheduleInfo, CoapError> {
        let data = self.post("schedules", req).await?;
        let info: proto::ScheduleInfo = codec::decode(&data)?;
        Ok(ScheduleInfo::from(info))
    }

    pub async fn update_schedule(
        &self,
        slot: u32,
        req: &proto::ScheduleUpdateRequest,
    ) -> Result<ScheduleInfo, CoapError> {
        let path = format!("schedules/{}", slot);
        let data = self.put(&path, req).await?;
        let info: proto::ScheduleInfo = codec::decode(&data)?;
        Ok(ScheduleInfo::from(info))
    }

    pub async fn delete_schedule(&self, slot: u32) -> Result<(), CoapError> {
        let path = format!("schedules/{}", slot);
        self.delete(&path).await?;
        Ok(())
    }

    // ── System endpoints ─────────────────────────────────────────────

    pub async fn get_system_info(&self) -> Result<SystemInfo, CoapError> {
        let data = self.get("system/info").await?;
        let info: proto::SystemInfo = codec::decode(&data)?;
        Ok(SystemInfo::from(info))
    }

    pub async fn set_hostname(&self, hostname: &str) -> Result<(), CoapError> {
        let req = proto::HostnameRequest {
            hostname: hostname.to_string(),
        };
        self.put("system/hostname", &req).await?;
        Ok(())
    }

    pub async fn reboot(&self) -> Result<(), CoapError> {
        let req = proto::Empty {};
        self.post("system/reboot", &req).await?;
        Ok(())
    }

    // ── Config export ────────────────────────────────────────────────

    pub async fn export_config(&self) -> Result<proto::ConfigFile, CoapError> {
        let data = self.get("config").await?;
        let config: proto::ConfigFile = codec::decode(&data)?;
        Ok(config)
    }

    // ── WiFi endpoints ───────────────────────────────────────────────

    pub async fn wifi_scan(&self) -> Result<Vec<WifiAp>, CoapError> {
        let data = self.get("wifi/scan").await?;
        let result: proto::WifiScanResult = codec::decode(&data)?;
        Ok(result.aps.into_iter().map(WifiAp::from).collect())
    }

    pub async fn wifi_connect(&self, ssid: &str, password: &str) -> Result<(), CoapError> {
        let req = proto::WifiConnectRequest {
            ssid: ssid.to_string(),
            password: password.to_string(),
        };
        self.post("wifi/connect", &req).await?;
        Ok(())
    }

    pub async fn wifi_status(&self) -> Result<WifiStatus, CoapError> {
        let data = self.get("wifi/status").await?;
        let status: proto::WifiStatus = codec::decode(&data)?;
        Ok(WifiStatus::from(status))
    }
}

// ── Internal helpers ──────────────────────────────────────────────────

fn map_io_error(e: std::io::Error) -> CoapError {
    match e.kind() {
        std::io::ErrorKind::TimedOut => CoapError::Timeout,
        _ => CoapError::Unreachable(e.to_string()),
    }
}

fn check_status(resp: &coap_lite::CoapResponse) -> Result<(), CoapError> {
    use prost::Message;

    let status = resp.get_status();
    match status {
        Status::Content
        | Status::Created
        | Status::Deleted
        | Status::Changed
        | Status::Valid => Ok(()),
        Status::BadRequest => {
            // Try to decode StatusResponse from payload to extract device error message
            if let Ok(sr) = proto::StatusResponse::decode(resp.message.payload.as_slice()) {
                if !sr.error_msg.is_empty() {
                    return Err(CoapError::RequestFailed(format!(
                        "Bad request: {}",
                        sr.error_msg
                    )));
                }
            }
            Err(CoapError::RequestFailed("Bad request (4.00)".into()))
        }
        _ => Err(CoapError::RequestFailed(format!(
            "{:?}: {}",
            status,
            String::from_utf8_lossy(&resp.message.payload)
        ))),
    }
}
