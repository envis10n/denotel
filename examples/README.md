# DenoTel Examples

This folder contains examples for the usage of the parser library.

## Client

The client example is a fairly simple MUD client with very basic GMCP support.

To try this, run:

`deno run --allow-net https://deno.land/x/denotel/examples/client.ts <host> <port>`

- <host> The hostname or IP address of the server.
- <port> The port for the server.

### GMCP Support

Though it has basic GMCP support, it is currently only confirmed to be working with Procedural Realms.

## Server

The server example is a simple telnet echo server with support for logging GMCP subnegotiations to stdout.

To try this, run:

`deno run --allow-net https://deno.land/x/denotel/examples/server.ts <host> <port>`

- <host> The hostname or IP address to bind to.
- <port> The port to bind to.
