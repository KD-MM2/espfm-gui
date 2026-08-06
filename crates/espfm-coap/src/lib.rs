pub mod proto {
    include!(concat!(env!("OUT_DIR"), "/espfm.rs"));
}

pub mod client;
pub mod codec;
pub mod error;
pub mod resources;
pub mod types;

pub use client::CoapClient;
pub use error::CoapError;
pub use resources::Resource;
pub use types::*;
