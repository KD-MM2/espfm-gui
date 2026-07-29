use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct DeviceConnection {
    pub client: espfm_coap::CoapClient,
    pub hostname: String,
}

pub struct AppState {
    pub connections: Arc<Mutex<HashMap<u32, DeviceConnection>>>,
    pub active_device_id: Arc<Mutex<Option<u32>>>,
    pub next_device_id: Arc<Mutex<u32>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(Mutex::new(HashMap::new())),
            active_device_id: Arc::new(Mutex::new(None)),
            next_device_id: Arc::new(Mutex::new(1)),
        }
    }
}
