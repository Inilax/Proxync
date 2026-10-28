//! Proxync Core — shared library for the desktop app and CLI.
//!
//! This crate contains all business logic (tunneling, proxy, recon, HTTP, storage)
//! without any Tauri dependency. Consumers subscribe to events via `tokio::broadcast`.

pub mod events;
pub mod recon;
pub mod proxy;
pub mod tunnel;
pub mod http;
pub mod storage;
pub mod cli_installer;
pub mod registry;
