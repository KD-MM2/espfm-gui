use std::borrow::Cow;
use std::net::SocketAddr;
use std::time::Duration;

use coap::client::ObserveMessage;
use coap::request::{Method, RequestBuilder};
use coap::UdpCoAPClient;
use coap_lite::ResponseType as Status;

use crate::codec;
use crate::error::CoapError;
use crate::proto;
use crate::resources::Resource;
use crate::types::*;

const REQUEST_TIMEOUT: Duration = Duration::from_secs(3);

/// High-level CoAP client for the ESPFanManager device.
pub struct CoapClient {
    client: UdpCoAPClient,
}

/// A handle that cancels a CoAP observe subscription on drop.
///
/// The terminator is kept in an `Option` because `oneshot::Sender::send`
/// consumes `self`; `Drop` takes it out so the observation is cancelled
/// exactly once.
pub struct ObserveHandle {
    _terminator: Option<tokio::sync::oneshot::Sender<ObserveMessage>>,
}

impl Drop for ObserveHandle {
    fn drop(&mut self) {
        if let Some(tx) = self._terminator.take() {
            let _ = tx.send(ObserveMessage::Terminate);
        }
    }
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

    /// Issue one declarative request. Encodes `req` (if any), sends via the
    /// transport (coap 0.27 transparently handles Block1/Block2), checks
    /// status, and decodes the response.
    async fn request<Req, Resp>(
        &self,
        res: &Resource<Req, Resp>,
        req: Option<&Req>,
    ) -> Result<Resp, CoapError>
    where
        Req: prost::Message + Default,
        Resp: prost::Message + Default,
    {
        let payload = match req {
            Some(r) => codec::encode(r)?,
            None => Vec::new(),
        };
        let request = RequestBuilder::new(res.path.as_ref(), res.method)
            .data((!payload.is_empty()).then_some(payload))
            .build();
        let response = self
            .client
            .send(request)
            .await
            .map_err(|e| map_io_error(e))?;
        check_status(&response)?;
        codec::decode(&response.message.payload)
    }

    // ── Fan endpoints ────────────────────────────────────────────────

    pub async fn get_fans(&self) -> Result<Vec<FanState>, CoapError> {
        let res = Resource::<proto::Empty, proto::FanList>::new("fans", Method::Get);
        let list: proto::FanList = self.request(&res, None).await?;
        Ok(list.fans.into_iter().map(FanState::from).collect())
    }

    pub async fn get_fan(&self, slot: u32) -> Result<FanState, CoapError> {
        let res = Resource::<proto::Empty, proto::FanInfo>::new_cow(
            Cow::Owned(format!("fans/{}", slot)),
            Method::Get,
        );
        let info: proto::FanInfo = self.request(&res, None).await?;
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
        let res = Resource::<proto::FanCreateRequest, proto::FanInfo>::new("fans", Method::Post);
        let info: proto::FanInfo = self.request(&res, Some(&req)).await?;
        Ok(FanState::from(info))
    }

    pub async fn update_fan(
        &self,
        slot: u32,
        req: &proto::FanUpdateRequest,
    ) -> Result<FanState, CoapError> {
        let res = Resource::<proto::FanUpdateRequest, proto::FanInfo>::new_cow(
            Cow::Owned(format!("fans/{}", slot)),
            Method::Put,
        );
        let info: proto::FanInfo = self.request(&res, Some(req)).await?;
        Ok(FanState::from(info))
    }

    pub async fn delete_fan(&self, slot: u32) -> Result<(), CoapError> {
        let res = Resource::<proto::Empty, proto::StatusResponse>::new_cow(
            Cow::Owned(format!("fans/{}", slot)),
            Method::Delete,
        );
        self.request(&res, None).await?;
        Ok(())
    }

    // ── Source endpoints ─────────────────────────────────────────────

    pub async fn get_sources(&self) -> Result<Vec<TempSource>, CoapError> {
        let res = Resource::<proto::Empty, proto::SourceList>::new("sources", Method::Get);
        let list: proto::SourceList = self.request(&res, None).await?;
        Ok(list.sources.into_iter().map(TempSource::from).collect())
    }

    pub async fn create_source(
        &self,
        req: &proto::SourceCreateRequest,
    ) -> Result<TempSource, CoapError> {
        let res = Resource::<proto::SourceCreateRequest, proto::SourceInfo>::new(
            "sources",
            Method::Post,
        );
        let info: proto::SourceInfo = self.request(&res, Some(req)).await?;
        Ok(TempSource::from(info))
    }

    pub async fn update_source(
        &self,
        slot: u32,
        req: &proto::SourceUpdateRequest,
    ) -> Result<TempSource, CoapError> {
        let res = Resource::<proto::SourceUpdateRequest, proto::SourceInfo>::new_cow(
            Cow::Owned(format!("sources/{}", slot)),
            Method::Put,
        );
        let info: proto::SourceInfo = self.request(&res, Some(req)).await?;
        Ok(TempSource::from(info))
    }

    pub async fn delete_source(&self, slot: u32) -> Result<(), CoapError> {
        let res = Resource::<proto::Empty, proto::StatusResponse>::new_cow(
            Cow::Owned(format!("sources/{}", slot)),
            Method::Delete,
        );
        self.request(&res, None).await?;
        Ok(())
    }

    pub async fn update_manual_temp(&self, id: u32, temp_c: f32) -> Result<(), CoapError> {
        let req = proto::ManualTempRequest { id, temp_c };
        let res = Resource::<proto::ManualTempRequest, proto::StatusResponse>::new(
            "sources/temp",
            Method::Post,
        );
        self.request(&res, Some(&req)).await?;
        Ok(())
    }

    // ── DS18B20 endpoints ────────────────────────────────────────────

    pub async fn scan_ds18b20(&self) -> Result<Vec<Ds18b20Device>, CoapError> {
        let res = Resource::<proto::Empty, proto::Ds18b20ScanResponse>::new(
            "ds18b20/scan",
            Method::Get,
        );
        let resp: proto::Ds18b20ScanResponse = self.request(&res, None).await?;
        Ok(resp.devices.into_iter().map(Ds18b20Device::from).collect())
    }

    pub async fn config_ds18b20(&self, gpio: u32) -> Result<(), CoapError> {
        let req = proto::Ds18b20ConfigRequest { gpio };
        let res = Resource::<proto::Ds18b20ConfigRequest, proto::StatusResponse>::new(
            "ds18b20/config",
            Method::Post,
        );
        self.request(&res, Some(&req)).await?;
        Ok(())
    }

    // ── Curve endpoints ──────────────────────────────────────────────

    pub async fn get_curves(&self) -> Result<Vec<CurveInfo>, CoapError> {
        let res = Resource::<proto::Empty, proto::CurveList>::new("curves", Method::Get);
        let list: proto::CurveList = self.request(&res, None).await?;
        Ok(list.curves.into_iter().map(CurveInfo::from).collect())
    }

    pub async fn create_curve(
        &self,
        req: &proto::CurveCreateRequest,
    ) -> Result<CurveInfo, CoapError> {
        let res = Resource::<proto::CurveCreateRequest, proto::CurveInfo>::new(
            "curves",
            Method::Post,
        );
        let info: proto::CurveInfo = self.request(&res, Some(req)).await?;
        Ok(CurveInfo::from(info))
    }

    pub async fn update_curve(
        &self,
        slot: u32,
        req: &proto::CurveUpdateRequest,
    ) -> Result<CurveInfo, CoapError> {
        let res = Resource::<proto::CurveUpdateRequest, proto::CurveInfo>::new_cow(
            Cow::Owned(format!("curves/{}", slot)),
            Method::Put,
        );
        let info: proto::CurveInfo = self.request(&res, Some(req)).await?;
        Ok(CurveInfo::from(info))
    }

    pub async fn delete_curve(&self, slot: u32) -> Result<(), CoapError> {
        let res = Resource::<proto::Empty, proto::StatusResponse>::new_cow(
            Cow::Owned(format!("curves/{}", slot)),
            Method::Delete,
        );
        self.request(&res, None).await?;
        Ok(())
    }

    // ── Schedule endpoints ───────────────────────────────────────────

    pub async fn get_schedules(&self) -> Result<Vec<ScheduleInfo>, CoapError> {
        let res = Resource::<proto::Empty, proto::ScheduleList>::new("schedules", Method::Get);
        let list: proto::ScheduleList = self.request(&res, None).await?;
        Ok(list.schedules.into_iter().map(ScheduleInfo::from).collect())
    }

    pub async fn create_schedule(
        &self,
        req: &proto::ScheduleCreateRequest,
    ) -> Result<ScheduleInfo, CoapError> {
        let res = Resource::<proto::ScheduleCreateRequest, proto::ScheduleInfo>::new(
            "schedules",
            Method::Post,
        );
        let info: proto::ScheduleInfo = self.request(&res, Some(req)).await?;
        Ok(ScheduleInfo::from(info))
    }

    pub async fn update_schedule(
        &self,
        slot: u32,
        req: &proto::ScheduleUpdateRequest,
    ) -> Result<ScheduleInfo, CoapError> {
        let res = Resource::<proto::ScheduleUpdateRequest, proto::ScheduleInfo>::new_cow(
            Cow::Owned(format!("schedules/{}", slot)),
            Method::Put,
        );
        let info: proto::ScheduleInfo = self.request(&res, Some(req)).await?;
        Ok(ScheduleInfo::from(info))
    }

    pub async fn delete_schedule(&self, slot: u32) -> Result<(), CoapError> {
        let res = Resource::<proto::Empty, proto::StatusResponse>::new_cow(
            Cow::Owned(format!("schedules/{}", slot)),
            Method::Delete,
        );
        self.request(&res, None).await?;
        Ok(())
    }

    // ── System endpoints ─────────────────────────────────────────────

    pub async fn get_system_info(&self) -> Result<SystemInfo, CoapError> {
        let res = Resource::<proto::Empty, proto::SystemInfo>::new("system/info", Method::Get);
        let info: proto::SystemInfo = self.request(&res, None).await?;
        Ok(SystemInfo::from(info))
    }

    pub async fn set_hostname(&self, hostname: &str) -> Result<(), CoapError> {
        let req = proto::HostnameRequest {
            hostname: hostname.to_string(),
        };
        let res = Resource::<proto::HostnameRequest, proto::StatusResponse>::new(
            "system/hostname",
            Method::Put,
        );
        self.request(&res, Some(&req)).await?;
        Ok(())
    }

    pub async fn reboot(&self) -> Result<(), CoapError> {
        let req = proto::Empty {};
        let res = Resource::<proto::Empty, proto::StatusResponse>::new("system/reboot", Method::Post);
        self.request(&res, Some(&req)).await?;
        Ok(())
    }

    // ── Config export ────────────────────────────────────────────────

    pub async fn export_config(&self) -> Result<proto::ConfigFile, CoapError> {
        let res = Resource::<proto::Empty, proto::ConfigFile>::new("config", Method::Get);
        let config: proto::ConfigFile = self.request(&res, None).await?;
        Ok(config)
    }

    // ── WiFi endpoints ───────────────────────────────────────────────

    pub async fn wifi_scan(&self) -> Result<Vec<WifiAp>, CoapError> {
        let res = Resource::<proto::Empty, proto::WifiScanResult>::new("wifi/scan", Method::Get);
        let result: proto::WifiScanResult = self.request(&res, None).await?;
        Ok(result.aps.into_iter().map(WifiAp::from).collect())
    }

    pub async fn wifi_connect(&self, ssid: &str, password: &str) -> Result<(), CoapError> {
        let req = proto::WifiConnectRequest {
            ssid: ssid.to_string(),
            password: password.to_string(),
        };
        let res = Resource::<proto::WifiConnectRequest, proto::StatusResponse>::new(
            "wifi/connect",
            Method::Post,
        );
        self.request(&res, Some(&req)).await?;
        Ok(())
    }

    pub async fn wifi_status(&self) -> Result<WifiStatus, CoapError> {
        let res = Resource::<proto::Empty, proto::WifiStatus>::new("wifi/status", Method::Get);
        let status: proto::WifiStatus = self.request(&res, None).await?;
        Ok(WifiStatus::from(status))
    }

    // ── Control tunables ─────────────────────────────────────────────

    pub async fn get_control(&self) -> Result<ControlTunables, CoapError> {
        let res = Resource::<proto::Empty, proto::ControlConfig>::new("control", Method::Get);
        let cfg: proto::ControlConfig = self.request(&res, None).await?;
        Ok(ControlTunables::from(cfg))
    }

    pub async fn set_control(&self, tunables: &ControlTunables) -> Result<(), CoapError> {
        let res = Resource::<proto::ControlConfig, proto::StatusResponse>::new(
            "control",
            Method::Put,
        );
        let req: proto::ControlConfig = tunables.into();
        self.request::<proto::ControlConfig, proto::StatusResponse>(&res, Some(&req))
            .await?;
        Ok(())
    }

    // ── Per-id GETs (full endpoint parity) ──────────────────────────

    pub async fn get_source(&self, slot: u32) -> Result<TempSource, CoapError> {
        let res = Resource::<proto::Empty, proto::SourceInfo>::new_cow(
            Cow::Owned(format!("sources/{}", slot)),
            Method::Get,
        );
        let info: proto::SourceInfo = self.request(&res, None).await?;
        Ok(TempSource::from(info))
    }

    pub async fn get_curve(&self, slot: u32) -> Result<CurveInfo, CoapError> {
        let res = Resource::<proto::Empty, proto::CurveInfo>::new_cow(
            Cow::Owned(format!("curves/{}", slot)),
            Method::Get,
        );
        let info: proto::CurveInfo = self.request(&res, None).await?;
        Ok(CurveInfo::from(info))
    }

    pub async fn get_schedule(&self, slot: u32) -> Result<ScheduleInfo, CoapError> {
        let res = Resource::<proto::Empty, proto::ScheduleInfo>::new_cow(
            Cow::Owned(format!("schedules/{}", slot)),
            Method::Get,
        );
        let info: proto::ScheduleInfo = self.request(&res, None).await?;
        Ok(ScheduleInfo::from(info))
    }

    // ── Observe ────────────────────────────────────────────

    /// Subscribe to a resource. Each notification is delivered as
    /// `std::io::Result<coap_lite::Packet>` to the handler (the caller decodes
    /// the payload to the expected proto type). Dropping the returned handle
    /// cancels the observation.
    pub async fn subscribe<H>(&self, path: &str, handler: H) -> Result<ObserveHandle, CoapError>
    where
        H: FnMut(std::io::Result<coap_lite::Packet>) + Send + 'static,
    {
        let terminator = self
            .client
            .observe(path, handler)
            .await
            .map_err(|e| CoapError::ObserveFailed(e.to_string()))?;
        Ok(ObserveHandle {
            _terminator: Some(terminator),
        })
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

#[cfg(test)]
mod tests {
    use super::*;
    use coap::server::{Server, UdpCoapListener};
    use tokio::net::UdpSocket;

    /// A tiny in-process CoAP server that echoes the request payload as a
    /// 2.05 Content response. `coap::Server` has no `local_addr()`, so we
    /// follow the crate's own test pattern: bind a `UdpSocket`, wrap it in a
    /// `UdpCoapListener`, and return the bound address.
    async fn spawn_echo_server() -> SocketAddr {
        use coap_lite::CoapRequest;

        let sock = UdpSocket::bind("127.0.0.1:0").await.unwrap();
        let bound = sock.local_addr().unwrap();
        let listener = Box::new(UdpCoapListener::from_socket(sock));
        let mut server = Server::from_listeners(vec![listener]);
        // The echo handler takes full control: bypass the server's automatic
        // observe handling so observe-register GETs are forwarded to the
        // handler (which echoes a 2.05 Content) instead of being answered
        // 4.04 NotFound by the built-in observer, which tracks no resources.
        server.automatic_observe_handling(true).await;
        tokio::spawn(async move {
            let _ = server
                .run(|mut req: Box<CoapRequest<SocketAddr>>| async move {
                    // `CoapResponse::new` already defaults the code to 2.05
                    // Content, so echoing the payload is sufficient.
                    if let Some(ref mut response) = req.response {
                        response.message.payload = req.message.payload.clone();
                    }
                    req
                })
                .await;
        });
        bound
    }

    #[tokio::test]
    async fn request_roundtrip_via_generic() {
        let addr = spawn_echo_server().await;
        let client = CoapClient::new(addr).await.unwrap();

        // Empty-payload GET: the echo server returns the (empty) request
        // bytes; decoding yields an empty FanList.
        let res = Resource::<proto::Empty, proto::FanList>::new("fans", Method::Get);
        let out: proto::FanList = client.request(&res, None).await.unwrap();
        assert_eq!(out.fans.len(), 0);

        // Payload POST: exercises encode -> attach -> send -> echo -> decode
        // with a non-empty request body, so `codec::encode` and the data
        // attachment path are covered.
        let msg = proto::WifiConnectRequest {
            ssid: "test".into(),
            password: "pw".into(),
        };
        let res = Resource::<proto::WifiConnectRequest, proto::WifiConnectRequest>::new(
            "wifi/connect",
            Method::Post,
        );
        let echo: proto::WifiConnectRequest = client.request(&res, Some(&msg)).await.unwrap();
        assert_eq!(echo, msg);
    }

    #[tokio::test]
    async fn control_roundtrip_via_echo() {
        let addr = spawn_echo_server().await;
        let client = CoapClient::new(addr).await.unwrap();

        // GET /control against the echo server returns empty payload → empty ControlTunables
        let got = client.get_control().await.unwrap();
        assert_eq!(got.hysteresis, None);
    }

    #[tokio::test]
    async fn set_control_roundtrip_via_echo() {
        let addr = spawn_echo_server().await;
        let client = CoapClient::new(addr).await.unwrap();

        let tunables = ControlTunables {
            hysteresis: Some(7),
            failsafe_policy: Some(proto::FailsafePolicy::FailsafeSafeDuty),
            ..Default::default()
        };

        // PUT /control: the echo returns the request bytes as 2.05, which
        // `set_control` decodes (leniently) as a StatusResponse and discards.
        // Proves the Some(payload) encode → PUT → check_status path.
        assert!(client.set_control(&tunables).await.is_ok());

        // The echo server echoes the request payload, so decode it as the
        // ControlConfig that was sent: full wire round-trip of a non-empty
        // config, including the enum-typed failsafe_policy field.
        let res = Resource::<proto::ControlConfig, proto::ControlConfig>::new(
            "control",
            Method::Put,
        );
        let cfg: proto::ControlConfig = (&tunables).into();
        let echo: proto::ControlConfig = client.request(&res, Some(&cfg)).await.unwrap();
        assert_eq!(echo, cfg);

        // Domain-level decode maps the echoed enum back to FailsafeSafeDuty
        // (the try_from path); structural equality via the newly-derived
        // PartialEq on ControlTunables.
        assert_eq!(ControlTunables::from(echo), tunables);
    }

    #[tokio::test]
    async fn subscribe_registers_and_terminates() {
        let addr = spawn_echo_server().await;
        let client = CoapClient::new(addr).await.unwrap();

        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<()>();
        let handle = client
            .subscribe("fans", move |_msg| {
                let _ = tx.send(());
            })
            .await
            .unwrap();
        // The echo server returns one 2.05 echo during registration, and
        // `observe()` invokes the handler synchronously with it before
        // returning, so a `()` is already buffered by the time we hold the
        // handle.
        assert_eq!(rx.try_recv(), Ok(()));
        // Dropping the handle sends Terminate; the echo server emits no
        // further notifications, so nothing else is buffered after teardown.
        drop(handle);
        assert!(rx.try_recv().is_err());
    }
}
