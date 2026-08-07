use coap::request::Method;
use prost::Message;
use std::borrow::Cow;
use std::marker::PhantomData;

/// A declarative CoAP resource: path + HTTP-style method + protobuf wire types.
///
/// The resource table covers the 32 GUI-supported (path, method) endpoints.
/// Firmware's `POST /config` import is deliberately excluded from this subset:
/// it schedules a 2s reboot on the device, and the GUI imports configs via
/// per-entity CRUD instead.
pub struct Resource<Req, Resp>
where
    Req: Message + Default,
    Resp: Message + Default,
{
    pub path: Cow<'static, str>,
    pub method: Method,
    pub _marker: PhantomData<(Req, Resp)>,
}

impl<Req, Resp> Resource<Req, Resp>
where
    Req: Message + Default,
    Resp: Message + Default,
{
    /// Static-table constructor: a compile-time known path.
    pub const fn new(path: &'static str, method: Method) -> Self {
        Self { path: Cow::Borrowed(path), method, _marker: PhantomData }
    }

    /// Dynamic-path constructor: an owned path (e.g. `sources/{slot}`).
    pub const fn new_cow(path: Cow<'static, str>, method: Method) -> Self {
        Self { path, method, _marker: PhantomData }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::proto;

    /// Rust arrays must have a single element type, so we erase each
    /// `Resource<Req, Resp>` to its (path, method) tuple. `path` is now a
    /// `Cow<'static, str>`; the table test only covers the static GUI
    /// endpoint table, whose entries are always `Cow::Borrowed`, so we unwrap
    /// the inner `'static` string (a `&str` would borrow the temporary
    /// `Resource` in the array and fail to compile). Dynamic per-id paths
    /// (`Cow::Owned`) live in `client.rs`, never in this table.
    fn path_method<Req, Resp>(r: &Resource<Req, Resp>) -> (&'static str, Method)
    where
        Req: Message + Default,
        Resp: Message + Default,
    {
        match &r.path {
            Cow::Borrowed(p) => (*p, r.method),
            Cow::Owned(_) => unreachable!("resource table uses only static paths"),
        }
    }

    /// Stable sort key for `Method` (`coap_lite::RequestType` implements
    /// `PartialOrd` but not `Ord`, so order methods by name for the multiset
    /// comparison).
    fn method_key(m: Method) -> &'static str {
        match m {
            Method::Get => "get",
            Method::Post => "post",
            Method::Put => "put",
            Method::Delete => "delete",
            _ => "other",
        }
    }

    /// The exact set of GUI-supported (path, method) endpoints, expressed
    /// independently of the `Resource` table so the table cannot silently
    /// drift (duplicate, missing, or wrong entry). Firmware's `POST /config`
    /// import is deliberately excluded (it reboots the device); the GUI
    /// imports configs via per-entity CRUD.
    const EXPECTED: [(&str, Method); 32] = [
        ("fans", Method::Get),
        ("fans", Method::Post),
        ("fans/0", Method::Get),
        ("fans/0", Method::Put),
        ("fans/0", Method::Delete),
        ("sources", Method::Get),
        ("sources", Method::Post),
        ("sources/0", Method::Get),
        ("sources/0", Method::Put),
        ("sources/0", Method::Delete),
        ("sources/temp", Method::Post),
        ("curves", Method::Get),
        ("curves", Method::Post),
        ("curves/0", Method::Get),
        ("curves/0", Method::Put),
        ("curves/0", Method::Delete),
        ("schedules", Method::Get),
        ("schedules", Method::Post),
        ("schedules/0", Method::Get),
        ("schedules/0", Method::Put),
        ("schedules/0", Method::Delete),
        ("system/info", Method::Get),
        ("system/hostname", Method::Put),
        ("system/reboot", Method::Post),
        ("config", Method::Get),
        ("wifi/scan", Method::Get),
        ("wifi/connect", Method::Post),
        ("wifi/status", Method::Get),
        ("ds18b20/scan", Method::Get),
        ("ds18b20/config", Method::Post),
        ("control", Method::Get),
        ("control", Method::Put),
    ];

    #[test]
    fn resource_table_covers_gui_supported_endpoints() {
        // The declared table must match EXPECTED as multisets: same count and
        // same (path, method) pairs — no duplicates, no missing or extra
        // endpoints, no wrong method.
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

        let mut actual = table.to_vec();
        actual.sort_unstable_by(|a, b| (a.0, method_key(a.1)).cmp(&(b.0, method_key(b.1))));

        let mut expected = EXPECTED.to_vec();
        expected.sort_unstable_by(|a, b| (a.0, method_key(a.1)).cmp(&(b.0, method_key(b.1))));

        assert_eq!(actual, expected);
    }
}
