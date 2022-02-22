# DenoTel Examples

This folder contains examples for the usage of the parser library.

## Client

The client example is a fairly simple MUD client with very basic GMCP support.

To try this, run:

`deno run --allow-net --allow-write https://raw.githubusercontent.com/envis10n/denotel/main/examples/client.ts <host> <port>`

- <host> The hostname or IP address of the server.
- <port> The port for the server.

### GMCP Support

Though it has basic GMCP support, it is currently only confirmed to be working with Procedural Realms.
