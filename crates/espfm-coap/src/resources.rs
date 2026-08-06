use coap::request::Method;
use prost::Message;
use std::marker::PhantomData;

/// A declarative CoAP resource: path + HTTP-style method + protobuf wire types.
pub struct Resource<Req, Resp>
where
    Req: Message + Default,
    Resp: Message + Default,
{
    pub path: &'static str,
    pub method: Method,
    pub _marker: PhantomData<(Req, Resp)>,
}

impl<Req, Resp> Resource<Req, Resp>
where
    Req: Message + Default,
    Resp: Message + Default,
{
    pub const fn new(path: &'static str, method: Method) -> Self {
        Self { path, method, _marker: PhantomData }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::proto;

    /// Erase the per-endpoint generic types so all 32 entries fit in one
    /// homogeneous array (Rust arrays need a single element type).
    fn path_method<Req, Resp>(r: &Resource<Req, Resp>) -> (&'static str, Method)
    where
        Req: Message + Default,
        Resp: Message + Default,
    {
        (r.path, r.method)
    }

    #[test]
    fn resource_table_is_complete() {
        // Every firmware endpoint the crate supports must appear in the table.
        let table = [
            path_method(&Resource::<proto::Empty, proto::FanList>::new("fans", Method::Get)),
            path_method(&Resource::<proto::FanCreateRequest, proto::FanInfo>::new("fans", Method::Post)),
            path_method(&Resource::<proto::Empty, proto::FanInfo>::new("fans/0", Method::Get)),
            path_method(&Resource::<proto::FanUpdateRequest, proto::FanInfo>::new("fans/0", Method::Put)),
            path_method(&Resource::<proto::Empty, proto::StatusResponse>::new("fans/0", Method::Delete)),
            path_method(&Resource::<proto::Empty, proto::SourceList>::new("sources", Method::Get)),
            path_method(&Resource::<proto::SourceCreateRequest, proto::SourceInfo>::new("sources", Method::Post)),
            path_method(&Resource::<proto::Empty, proto::SourceInfo>::new("sources/0", Method::Get)),
            path_method(&Resource::<proto::SourceUpdateRequest, proto::SourceInfo>::new("sources/0", Method::Put)),
            path_method(&Resource::<proto::Empty, proto::StatusResponse>::new("sources/0", Method::Delete)),
            path_method(&Resource::<proto::ManualTempRequest, proto::StatusResponse>::new("sources/temp", Method::Post)),
            path_method(&Resource::<proto::Empty, proto::CurveList>::new("curves", Method::Get)),
            path_method(&Resource::<proto::CurveCreateRequest, proto::CurveInfo>::new("curves", Method::Post)),
            path_method(&Resource::<proto::Empty, proto::CurveInfo>::new("curves/0", Method::Get)),
            path_method(&Resource::<proto::CurveUpdateRequest, proto::CurveInfo>::new("curves/0", Method::Put)),
            path_method(&Resource::<proto::Empty, proto::StatusResponse>::new("curves/0", Method::Delete)),
            path_method(&Resource::<proto::Empty, proto::ScheduleList>::new("schedules", Method::Get)),
            path_method(&Resource::<proto::ScheduleCreateRequest, proto::ScheduleInfo>::new("schedules", Method::Post)),
            path_method(&Resource::<proto::Empty, proto::ScheduleInfo>::new("schedules/0", Method::Get)),
            path_method(&Resource::<proto::ScheduleUpdateRequest, proto::ScheduleInfo>::new("schedules/0", Method::Put)),
            path_method(&Resource::<proto::Empty, proto::StatusResponse>::new("schedules/0", Method::Delete)),
            path_method(&Resource::<proto::Empty, proto::SystemInfo>::new("system/info", Method::Get)),
            path_method(&Resource::<proto::HostnameRequest, proto::StatusResponse>::new("system/hostname", Method::Put)),
            path_method(&Resource::<proto::Empty, proto::StatusResponse>::new("system/reboot", Method::Post)),
            path_method(&Resource::<proto::Empty, proto::ConfigFile>::new("config", Method::Get)),
            path_method(&Resource::<proto::Empty, proto::WifiScanResult>::new("wifi/scan", Method::Get)),
            path_method(&Resource::<proto::WifiConnectRequest, proto::StatusResponse>::new("wifi/connect", Method::Post)),
            path_method(&Resource::<proto::Empty, proto::WifiStatus>::new("wifi/status", Method::Get)),
            path_method(&Resource::<proto::Empty, proto::Ds18b20ScanResponse>::new("ds18b20/scan", Method::Get)),
            path_method(&Resource::<proto::Ds18b20ConfigRequest, proto::StatusResponse>::new("ds18b20/config", Method::Post)),
            path_method(&Resource::<proto::Empty, proto::ControlConfig>::new("control", Method::Get)),
            path_method(&Resource::<proto::ControlConfig, proto::StatusResponse>::new("control", Method::Put)),
        ];
        assert_eq!(table.len(), 32);
        assert_eq!(table[0].0, "fans");
        assert_eq!(table[0].1, Method::Get);
        assert_eq!(table[30].0, "control");
        assert_eq!(table[30].1, Method::Get);
        assert_eq!(table[31].0, "control");
        assert_eq!(table[31].1, Method::Put);
    }
}
