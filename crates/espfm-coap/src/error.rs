use thiserror::Error;

#[derive(Error, Debug)]
pub enum CoapError {
    #[error("CoAP request failed: {0}")]
    RequestFailed(String),

    #[error("Connection timeout")]
    Timeout,

    #[error("Device unreachable: {0}")]
    Unreachable(String),

    #[error("Protobuf decode error: {0}")]
    DecodeError(#[from] prost::DecodeError),

    #[error("Protobuf encode error: {0}")]
    EncodeError(#[from] prost::EncodeError),

    #[error("Invalid response: {0}")]
    InvalidResponse(String),

    #[error("Observe subscription failed: {0}")]
    ObserveFailed(String),
}
