use mdns_sd::{ServiceDaemon, ServiceEvent};
use std::collections::HashSet;
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
    // Browse for _espfm._tcp (custom service with TXT records for version/firmware)
    // The firmware registers both _coap._udp and _espfm._tcp on port 5683
    let receiver = mdns
        .browse("_espfm._tcp.local.")
        .map_err(|e| MdnsError::DaemonError(format!("{e}")))?;

    let mut devices = Vec::new();
    let mut seen_ips = HashSet::new();
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
                        // Deduplicate by IP address
                        if seen_ips.insert(ip.clone()) {
                            devices.push(DiscoveredDevice {
                                hostname,
                                ip: ip.clone(),
                                port: info.get_port(),
                            });
                        }
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
