# Mobile multi-touch controller reference

The submitted controller, octree, and faction-ability proposal is preserved in [`mobile-multitouch-controller-source.txt`](./mobile-multitouch-controller-source.txt). This note records the integration choices for Mission To Earth.

## Touch controller integration

The game already uses pointer IDs to keep simultaneous movement, look, fire, focus, utility, and interaction inputs separate. The touch controller maps the left side to movement and the right side to full yaw/pitch look, with independent right- and left-hand fire triggers and a focus toggle.

This update hardens pointer ownership and release behavior:

- Only one finger owns the movement stick, right-side look pad, or utility disc at a time; separate fire buttons remain independently multi-touchable.
- Releasing one of multiple pointers on a shared fire action does not stop that action while another pointer still holds it.
- Pointer cancellation, lost capture, browser blur, hidden tabs, and component unmount release held inputs without accidentally turning a cancelled flick into a jump or slide.
- Delayed touch pulses are tracked and cancelled on focus loss or unmount. Touch-layout persistence now tolerates unavailable browser storage.

## Spatial and ability proposals

The octree sample is not adopted. It inserts an AABB into every child it overlaps, so cross-split geometry can be duplicated across many branches; its ray test also substitutes a small epsilon for zero direction components and can miss a ray that starts inside a box. The current server already has a player spatial hash and a bounded static collision map; the latter deliberately remains a linear scan until trusted level geometry and profiling justify another index.

The faction-ability sample is also not integrated as server-authoritative gameplay. It is not connected to a match input or transport path, and its active duration is decremented to zero without being restored before a later activation. Server-owned ability actions belong with the future authenticated multiplayer input contract, not as a disconnected module.

Keep the existing input contract: movement left, full camera look right, independent hand fire, and focus as a separate action. Do not present the sample's networking or ability pseudocode as live multiplayer support.
