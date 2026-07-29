use mdns_sd::{ServiceDaemon, ServiceEvent};
use std::time::Duration;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum MdnsError {
    #[error("mDNS daemon error: {0}")]
    DaemonError(String),
    #[error("Service discovery timeout")]
    Timeout,
}

#[derive(Debug, Clone)]
pub struct DiscoveredDevice {
    pub hostname: String,
    pub ip: String,
    pub port: u16,
}

pub async fn discover_devices(timeout: Duration) -> Result<Vec<DiscoveredDevice>, MdnsError> {
    let mdns = ServiceDaemon::new().map_err(|e| MdnsError::DaemonError(format!("{e}")))?;
    let receiver = mdns
        .browse("_coap._udp")
        .map_err(|e| MdnsError::DaemonError(format!("{e}")))?;

    let mut devices = Vec::new();
    let deadline = tokio::time::Instant::now() + timeout;

    loop {
        let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
        if remaining.is_zero() {
            break;
        }

        match tokio::time::timeout(remaining, receiver.recv_async()).await {
            Ok(Ok(event)) => {
                if let ServiceEvent::ServiceResolved(info) = event {
                    let hostname = info.get_hostname().trim_end_matches('.').to_string();
                    let addresses: Vec<String> =
                        info.get_addresses().iter().map(|a| a.to_string()).collect();
                    if let Some(ip) = addresses.first() {
                        devices.push(DiscoveredDevice {
                            hostname,
                            ip: ip.clone(),
                            port: info.get_port(),
                        });
                    }
                }
            }
            Ok(Err(_)) => break,
            Err(_) => break,
        }
    }

    let _ = mdns.shutdown();
    Ok(devices)
}
