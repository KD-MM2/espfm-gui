use prost::Message;

use crate::error::CoapError;

pub fn encode<M: Message>(msg: &M) -> Result<Vec<u8>, CoapError> {
    let mut buf = Vec::new();
    msg.encode(&mut buf)?;
    Ok(buf)
}

pub fn decode<M: Message + Default>(data: &[u8]) -> Result<M, CoapError> {
    M::decode(data).map_err(CoapError::DecodeError)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::proto;

    #[test]
    fn test_encode_decode_fan_info() {
        let fan = proto::FanInfo {
            id: 0,
            name: "CPU Fan".to_string(),
            mode: 1,
            duty: 62,
            rpm: 1247,
            enabled: true,
            inverted: false,
            pwm_gpio: 4,
            tach_gpio: 8,
            source_id: 255,
            curve_id: 0,
            schedule_id: 255,
            group_id: 0,
            alarm: 0,
        };
        let bytes = encode(&fan).unwrap();
        let decoded: proto::FanInfo = decode(&bytes).unwrap();
        assert_eq!(decoded.name, "CPU Fan");
        assert_eq!(decoded.rpm, 1247);
    }

    #[test]
    fn test_encode_decode_system_info() {
        let info = proto::SystemInfo {
            version: "3.0.0".to_string(),
            uptime_s: 86400,
            heap_free: 124000,
            fan_count: 3,
            source_count: 2,
            curve_count: 1,
            schedule_count: 0,
            hostname: "esp-fan-01".to_string(),
        };
        let bytes = encode(&info).unwrap();
        let decoded: proto::SystemInfo = decode(&bytes).unwrap();
        assert_eq!(decoded.version, "3.0.0");
        assert_eq!(decoded.hostname, "esp-fan-01");
    }
}
