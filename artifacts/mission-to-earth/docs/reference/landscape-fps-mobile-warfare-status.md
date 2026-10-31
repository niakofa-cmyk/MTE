# Landscape FPS and mobile warfare implementation status

This status note accompanies the full, verbatim product brief in `landscape-fps-mobile-warfare-source.txt`. It is a scoped implementation snapshot, not a claim that MTE is a finished mobile or competitive product.

## In place after this milestone

- The existing Three.js Nod mission remains the playable client; no replacement scaffold or engine migration was introduced.
- Touch-first play recommends landscape only after mission deployment. It offers browser fullscreen when available and always lets the player continue in portrait. The browser is not forced to rotate.
- The combat HUD and touch controls respect safe areas and use a denser layout in landscape. Mobile combat now opens with the essential objective, health/ammo, movement/look, fire, focus, and utility controls; secondary telemetry, squad/feed, server loot cache, and competitive round details stay tucked away until requested.
- Touch users can select Beginner, Tactical, or Advanced presets, choose left- or right-handed layout, and tune Movement, Aim, and Assist independently. Settings are validated, clamped, persisted locally, and resettable. The Cinder Row mobile round panel starts as a compact status chip. Existing desktop and gamepad mappings remain unchanged.
- The current game already has independent touch movement/look pointers, weapon fire and reload controls, keyboard/mouse support, Gamepad API support, campaign mission UI, and Cinder Row private/ranked entry points. These are foundations, not evidence of mobile device or production multiplayer certification.

## Still required for the brief's full target

- Test landscape and portrait behavior on real Android and iOS devices, including fullscreen/orientation differences, safe areas, touch cancellation, and long sessions.
- Browser-emulated touch tests verify virtual-stick response and input delivery, but do not certify real player displacement, camera rotation, weapon damage, touch-coordinate fidelity, or extraction on a physical device.
- Add and validate optional gyroscope aiming, haptic feedback, auto-fire options, complete draggable HUD placement, and controller settings only with platform-specific testing.
- Build and measure Performance, Balanced, and High Fidelity rendering profiles; current renderer caps pixel ratio but does not dynamically certify the brief's frame-rate targets.
- Improve authored character/weapon models, animation, positional audio, and environment assets; these require production assets and art review, not only CSS or TypeScript.
- Build and verify Living Operations, persistent faction campaigns, vehicles, cooperative PvE, seasonal ranked play, and larger player-count modes as separate gameplay milestones.
- Run the full campaign and a complete 4v4 match on target devices and servers, recording frame time, memory, battery, latency, reconnect behavior, and match stability.

## Constraints for future work

- Preserve the established MTE identity; use interaction patterns as inspiration, not proprietary maps, artwork, branding, or copied content.
- Keep campaign and competitive warfare distinct at the mode level while sharing systems only where their rules and authority genuinely match.
- Do not claim native orientation lock, physical-device support, GPU performance, or production multiplayer certification from browser emulation.
- Continue with one complete, testable mission and one complete 4v4 match before increasing map scale or player count.
