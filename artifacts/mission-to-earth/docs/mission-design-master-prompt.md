# Mission To Earth — The AI Game-Building Master Prompt

After checking the latest available GitHub commit history for [WAR FOR MARS — WFM Repository](https://github.com/niakofa-cmyk/WFM?utm_source=chatgpt.com), I would approach **Mission To Earth** as a new game built on the strongest proven foundations of WAR FOR MARS—not simply convert a space shooter into a ground shooter.

The latest commit I could verify is [`4b31352`](https://github.com/niakofa-cmyk/WFM/commit/4b31352deef271c4c91a83d58d0932489c546cf2), dated October 20, 2026. Its verification report documents passing workspace typechecks, 41 automated tests, and production builds for the verified code commit. It also identifies important limitations: the campaign remains a four-sortie foundation, production account flows have not been verified, and real-device mobile certification has not been performed. 

That distinction matters. **WFM provides a useful technical foundation, but it does not yet prove that an open-world FPS will meet its performance, gameplay, or production requirements.**

## 1. The game I would tell the AI to build

### Mission To Earth

**Genre:** Cinematic, open-world, first-person action shooter
**Experience:** A story-driven military science-fiction adventure with exploration, tactical combat, dynamic missions, and a world that continues to respond to the player's actions.

The goal is to make players feel as though they have stepped into a living cinematic world—not entered a small shooting gallery.

Imagine a game where players can:

* Walk through dense forests, abandoned cities, military bases, rural settlements, deserts, and alien-occupied territory.
* Explore a connected world rather than selecting every mission from a menu.
* Fight intelligent enemies that detect, flank, pursue, retreat, reinforce, and defend strategic locations.
* Discover missions organically through exploration, radio transmissions, civilians, allied patrols, and enemy activity.
* Enter buildings, search for supplies, rescue survivors, recover intelligence, and liberate settlements.
* Use firearms, tactical equipment, vehicles, and environmental cover.
* Experience a cinematic story with scripted sequences, dialogue, consequences, and major battles.
* Watch the world change as enemy forces lose territory, allied forces gain strength, and settlements are liberated.
* Save progress and return to a persistent campaign.
* Eventually play with friends in cooperative missions, provided the single-player foundation is stable.

The defining experience should be **a believable world, intelligent combat, cinematic storytelling, and meaningful freedom of action**.

---

## 2. Copy-and-paste master prompt for your AI game developer

I would use the following as the main build prompt in Replit Agent or another AI coding environment that can inspect a repository, implement code, run tests, and iterate on the actual game.

This prompt is deliberately designed to prevent a common failure: an AI creates a visually impressive menu and a small playable demo, then claims it has built an open-world game.

# PROJECT: MISSION TO EARTH

## Cinematic Open-World First-Person Shooter

### YOUR ROLE

Act as a senior AAA game director, principal gameplay engineer, first-person shooter specialist, AI systems engineer, open-world architect, cinematic narrative designer, technical artist, multiplayer engineer, performance engineer, and quality-assurance lead.

Your assignment is to build **Mission To Earth**, a playable, extensible, cinematic open-world first-person shooter.

You are responsible for inspecting the existing WAR FOR MARS project, identifying reusable technology, designing the appropriate architecture, implementing the game, testing the actual implementation, and documenting what works and what remains incomplete.

Do not stop at a concept document, prototype description, static mockup, landing page, character-selection screen, or collection of disconnected gameplay systems.

Build a working game in stages, with each stage producing demonstrable, testable functionality.

Do not claim a feature is complete unless its implementation and relevant tests support that claim.

---

# 1. THE VISION

Mission To Earth is a cinematic, story-driven, open-world first-person shooter set on Earth during a global science-fiction conflict.

The player enters a world threatened by a powerful hostile force. Governments, military organizations, local resistance groups, civilians, and competing factions struggle to survive as the conflict spreads across the planet.

The player begins with limited equipment, incomplete intelligence, and access to a small operational area.

Through exploration, tactical decisions, combat, rescues, intelligence gathering, and mission completion, the player gains equipment, relationships, allies, territory, and access to larger operations.

The world must feel alive beyond the player's immediate field of view.

Allies conduct patrols. Enemies occupy strategic positions. Settlements experience shortages and attacks. Radio communications reveal events. Missions become available through discovery. Liberated locations change ownership. Enemy forces react to the player's previous actions.

The game combines:

* First-person gunplay.
* Open-world exploration.
* Cinematic storytelling.
* Tactical AI.
* Dynamic missions.
* Character progression.
* Equipment customization.
* Vehicles and transportation.
* Environmental interaction.
* Persistent world-state changes.
* Optional cooperative play in a later development phase.

The intended result is a recognizable, playable game with a strong identity—not a generic FPS template.

## Creative principles

1. The player must have meaningful freedom of movement and approach.
2. Combat must reward awareness, positioning, accuracy, preparation, and tactical decisions.
3. Environments must tell stories without relying entirely on dialogue.
4. Missions must have clear objectives and meaningful outcomes.
5. Enemies must behave intelligently rather than simply running toward the player.
6. The world must react to important player decisions.
7. Cinematic moments must emerge from the narrative and gameplay, not replace gameplay.
8. Performance and responsive controls take priority over expensive visual effects.
9. Systems must be modular, testable, and extensible.
10. The game must remain playable while features are developed incrementally.

---

# 2. INSPECT WAR FOR MARS BEFORE BUILDING

Repository:
[https://github.com/niakofa-cmyk/WFM](https://github.com/niakofa-cmyk/WFM)

Treat WAR FOR MARS as a technical reference and possible source of reusable systems, not as the final design for Mission To Earth.

First, inspect the actual repository, current branch, recent commits, directory structure, package configuration, rendering engine, server, database, authentication integration, gameplay code, tests, and verification reports.

Do not assume that a documented feature is production-ready.

Classify existing systems into:

* Reusable without significant changes.
* Reusable after adaptation.
* Requiring a new implementation.
* Not appropriate for Mission To Earth.

Investigate the existing React, TypeScript, Three.js/WebGL game architecture and API server.

Evaluate whether the existing rendering technology can support the proposed FPS. Do not migrate engines merely because another engine is popular.

However, do not force a browser-based 3D architecture to meet AAA-style visual or world-scale requirements if profiling demonstrates that it cannot meet the actual targets.

If a more capable engine is necessary, document the evidence, recommend an appropriate migration strategy, and separate that decision from unrelated gameplay development.

Do not destroy, overwrite, or destabilize WAR FOR MARS.

Build Mission To Earth in a separate application, repository, or explicitly isolated project directory. Preserve WFM as its own product.

Reuse only systems whose behavior and compatibility have been verified.

Potentially reusable concepts include:

* Authentication boundaries.
* Player profile and progression models.
* Server-validated rewards.
* Inventory and equipment foundations.
* Mission-state management.
* Persistent discoveries.
* World events.
* API architecture.
* Automated testing patterns.
* Deployment and environment isolation.

Do not automatically reuse space-combat physics, spacecraft controls, space-specific weapons, galaxy navigation, or ship-balancing assumptions.

Deliver a short architecture assessment before committing to major structural decisions.

---

# 3. WORLD DESIGN: A CONNECTED, EXPLORABLE EARTH

Build the world as a collection of connected, explorable regions that together create the feeling of a much larger planet.

Start with one polished, continuous playable region rather than a huge empty map.

The first region must contain multiple distinct environments:

* An abandoned urban district.
* A forest or wilderness area.
* A military checkpoint.
* A hostile encampment.
* A civilian settlement or resistance safehouse.
* A road network.
* A mission-critical facility.
* Hidden locations containing supplies, intelligence, or narrative discoveries.

Connect these locations through traversable terrain and believable transitions.

The player must be able to travel between key locations without repeatedly returning to a level-selection screen.

Implement a world-streaming architecture appropriate to the chosen engine. Load and unload distant content as necessary, prevent obvious loading interruptions, and manage memory deliberately.

Do not create an enormous map filled with repetitive terrain and empty buildings simply to advertise a large world.

Prioritize density, environmental storytelling, traversal, meaningful encounters, and replayability.

### Environmental storytelling

Use environmental details to communicate what happened before the player arrived.

Examples include:

* Abandoned vehicles and damaged infrastructure.
* Evacuation areas.
* Makeshift medical stations.
* Barricaded buildings.
* Radio equipment.
* Destroyed checkpoints.
* Supply shortages.
* Evidence of recent battles.
* Civilian shelters.
* Enemy propaganda and command facilities.

Important locations should have recognizable visual identities and functional purposes.

### World interaction

Support the following where appropriate:

* Opening doors and entering selected buildings.
* Searching containers and supply caches.
* Collecting mission objects.
* Reading intelligence documents.
* Activating communication equipment.
* Interacting with friendly characters.
* Rescuing civilians.
* Disabling enemy infrastructure.
* Capturing strategic locations.

Use reusable interaction components rather than creating unrelated one-off scripts for every object.

---

# 4. FIRST-PERSON PLAYER CONTROLLER

Build a complete first-person controller with responsive input and consistent behavior.

Required mechanics:

* First-person camera and mouse-look.
* Keyboard and mouse support.
* Gamepad support where the target platform allows it.
* Touchscreen controls for mobile where feasible.
* Walking and running.
* Sprint stamina or another clearly defined movement limitation.
* Crouching.
* Jumping where appropriate to the terrain.
* Mantling and obstacle traversal.
* Ladder or contextual climbing interactions where needed.
* Smooth camera behavior.
* Footstep audio that responds to terrain.
* Fall and impact reactions.
* Weapon aiming and recoil.
* Reloading and ammunition tracking.
* Health and damage feedback.
* Interaction prompts.
* Context-sensitive movement.
* Pause and settings menus.

Movement must feel deliberate, grounded, and responsive.

Avoid excessive camera shake, forced motion blur, long input delays, and animations that prevent the player from responding to immediate threats.

Do not let the camera pass through solid geometry under normal conditions.

Handle slopes, steps, collision boundaries, narrow doorways, moving platforms, and uneven terrain robustly.

Provide adjustable sensitivity, key bindings where supported, and accessibility options.

Do not simulate movement with a camera floating through a static scene. Implement a real collision-aware player controller.

---

# 5. FIREARMS AND COMBAT

Create a modular weapon system.

The initial playable build should include at least:

1. A standard assault rifle.
2. A semi-automatic precision rifle.
3. A shotgun.
4. A sidearm.
5. A throwable tactical device.

Additional weapons should be added after the initial combat loop is reliable.

Each weapon must have a distinct purpose, handling characteristics, sound profile, recoil pattern, reload behavior, ammunition capacity, and effective range.

Implement:

* Firing input.
* Aim-down-sights behavior.
* Weapon switching.
* Reloading.
* Magazine and reserve ammunition.
* Hitscan or projectile-based damage as appropriate.
* Hit detection.
* Damage calculation.
* Recoil and recovery.
* Muzzle effects.
* Impact effects.
* Weapon audio.
* Reload audio.
* Ammunition pickups.
* Weapon pickup or equipment management.
* Enemy damage reactions.
* Death and defeat states.

Make accuracy, recoil, movement, and range influence the experience.

Avoid making every weapon feel identical with different models attached.

For weapons intended to damage enemies, validate hits and damage through a coherent combat system. Do not make visual hit effects count as successful damage without checking the actual target and collision result.

Use clear, configurable combat data so that weapon balance can be adjusted without rewriting the entire combat implementation.

Provide an initial combat arena or encounter where the player can test every available weapon.

---

# 6. INTELLIGENT ENEMY AI

Enemy behavior is one of the most important features of Mission To Earth.

Build enemies that perceive the player, interpret threats, coordinate behavior, and react to changing conditions.

Implement a combination of:

* Line-of-sight checks.
* Vision distance and field of view.
* Hearing and sound-based awareness.
* Suspicion states.
* Alert states.
* Search behavior.
* Cover selection.
* Flanking.
* Suppressive fire where supported.
* Retreat and repositioning.
* Reinforcement requests.
* Squad coordination.
* Patrol routes.
* Guarding objectives.
* Investigation of disturbances.
* Damage reactions.
* Death and cleanup.

Use an explicit, testable AI state machine, behavior tree, utility system, or an appropriate combination.

Example behavioral sequence:

PATROLLING → SUSPICIOUS → INVESTIGATING → ALERTED → ENGAGING → SEARCHING → RETURNING TO DUTY.

The transitions must depend on actual gameplay conditions.

Enemies must not automatically know the player's location through walls or across the map.

If the player breaks line of sight, enemies should investigate the last known position, search plausible locations, communicate with allies when appropriate, and eventually return to another behavior if they lose the trail.

Enemies must use valid navigation paths and recover from blocked routes.

Create distinct enemy roles, such as:

* Rifle infantry.
* Heavy infantry.
* Reconnaissance units.
* Marksmen.
* Close-range attackers.
* Squad leaders.
* Reinforcement units.

Implement a useful subset first, then expand the roster.

Do not implement numerous enemy classes that are visually different but share broken or indistinguishable behavior.

Build automated tests for detection, loss of sight, damage response, navigation failures, and enemy defeat.

---

# 7. CINEMATIC STORYTELLING

Create a coherent campaign with a central mystery, recognizable characters, escalating stakes, and a clear reason for the player to continue.

The opening must establish:

* The world and its immediate danger.
* The player's role.
* The first meaningful objective.
* The threat facing the local population.
* The larger conflict that will drive the campaign.

Begin with a cinematic introduction that transitions into interactive gameplay without unnecessarily delaying player control.

Use a mixture of:

* In-engine cutscenes.
* Scripted gameplay sequences.
* Radio dialogue.
* Environmental discoveries.
* Character conversations.
* Mission briefings.
* Cinematic combat encounters.
* Optional narrative discoveries.

Build a mission and dialogue framework that can be extended without hard-coding the entire story into the main game loop.

Cinematics must support skipping, interruption rules, save-state consistency, and correct transitions back into gameplay.

Never leave the player permanently trapped in a cutscene because a trigger failed.

### Campaign structure

Design an initial campaign arc containing:

1. A playable opening and first-contact incident.
2. A survival and escape mission.
3. An operation to establish contact with allied forces.
4. A reconnaissance or intelligence-gathering mission.
5. A mission to rescue survivors or liberate a location.
6. A major assault on an enemy-controlled objective.
7. A consequential story decision.
8. A chapter-ending encounter that reveals a larger threat.

These are narrative targets, not permission to create eight empty mission markers.

Build a smaller number of complete, playable missions before expanding the campaign.

Every implemented mission must include a beginning, objectives, gameplay, success and failure conditions, appropriate feedback, and a reliable completion transition.

---

# 8. OPEN-WORLD MISSION SYSTEM

Create a mission framework that supports both authored story missions and dynamic world activities.

Mission categories should include:

* Main campaign operations.
* Side missions.
* Rescue operations.
* Reconnaissance.
* Supply recovery.
* Hostage or survivor recovery.
* Enemy-base infiltration.
* Infrastructure sabotage.
* Territory liberation.
* Intelligence collection.
* Dynamic defense events.

Every mission must have structured data for:

* Unique identifier.
* Title and description.
* Availability requirements.
* Location.
* Prerequisites.
* Objectives.
* Optional objectives.
* Completion conditions.
* Failure conditions.
* Rewards.
* World-state consequences.
* Save and resume behavior.

Support multi-stage objectives.

For example, an operation may require the player to discover a patrol route, infiltrate a compound, disable communications, recover intelligence, and escape.

Objectives must update in response to actual gameplay events.

Do not mark an objective complete merely because the player approaches its marker.

Support objective markers, contextual hints, map information, and journal entries without forcing the player to follow a single rigid route.

Where possible, allow different tactical approaches to achieve the same objective.

Mission completion must update the player's progression and any relevant world-state records through validated game logic.

---

# 9. A LIVING WORLD AND CONSEQUENCES

The world should respond to the player's actions.

Implement a world-state system that tracks important changes, including:

* Which settlements are controlled by which factions.
* Which mission-critical facilities have been disabled.
* Which intelligence has been discovered.
* Which allied characters have been rescued.
* Which strategic objectives have been captured.
* Which operations are complete.
* Which world events have occurred.
* Which supplies or resources have been recovered.

These records must influence gameplay where appropriate.

Examples:

* Liberating a settlement increases friendly patrol presence.
* Disabling a communications facility delays enemy reinforcements.
* Recovering intelligence reveals a new operation.
* Rescuing a specialist unlocks an equipment or support option.
* Failing to defend a location can change later encounters.
* Clearing an enemy checkpoint changes the available travel routes.

Do not simulate an entire planet's population or military activity at full fidelity.

Use a scalable world simulation with high-detail behavior near the player and simplified state updates for distant regions.

World changes must persist correctly across saves and restarts.

Avoid contradictory states, duplicated rewards, and repeated mission completions caused by loading or network retries.

---

# 10. WEAPONS, INVENTORY, AND PROGRESSION

Create a unified player progression system.

Track relevant information such as:

* Player identity.
* Campaign progress.
* Completed missions.
* Discovered locations.
* Equipment.
* Ammunition and supplies.
* Unlocked weapons.
* Character upgrades.
* Collected intelligence.
* Relevant faction reputation.
* World-state consequences.

Build an inventory system that handles acquisition, removal, capacity, equipment changes, and persistence.

Equipment must have actual gameplay effects.

Examples include:

* Optics affecting aiming.
* Armor affecting survivability.
* Medical supplies restoring health.
* Tactical devices affecting enemy perception or movement.
* Weapon upgrades affecting recoil, capacity, or handling.

Prevent invalid items, negative ammunition, impossible inventory quantities, duplicate reward claims, and unauthorized progression changes.

For saved or online profiles, the server must validate valuable progression and rewards. Do not trust a client-submitted balance or mission-completion claim as proof that the player earned it.

Keep authentication, game-session identity, and player ownership checks separate from visual UI state.

Use a migration strategy for persistent data.

Do not store important player progression exclusively in browser memory or local UI state.

---

# 11. WORLD MAP AND PLAYER NAVIGATION

Provide an interactive world map that communicates the player's surroundings and known objectives.

Include:

* Current player position.
* Discovered locations.
* Mission objectives.
* Allied and hostile locations where known.
* Fast-travel destinations when unlocked.
* Relevant roads and terrain.
* Mission status.
* Points of interest.
* Optional navigation markers.

Support a compass and a contextual HUD.

The player should be able to explore without having to stare at an oversized interface.

Unexplored locations should not automatically reveal all their contents.

Fast travel must respect the game's rules and should not allow the player to bypass critical encounters or break mission logic.

The map must reflect actual game state, not a collection of decorative markers.

---

# 12. VEHICLES AND TRAVERSAL

Design the world so that vehicles can become meaningful additions.

Potential vehicle types include:

* Military transport.
* Reconnaissance vehicle.
* Light tactical vehicle.
* Utility transport.

Do not implement a large fleet before basic on-foot gameplay works.

The first vehicle should support a complete, reliable loop:

1. Find or approach the vehicle.
2. Enter it.
3. Control its movement.
4. Avoid or collide with obstacles appropriately.
5. Exit it.
6. Resume on-foot control.
7. Save or restore the relevant state correctly.

Vehicles must interact with the world through real collision and movement logic.

Do not display a vehicle model while leaving the player controller responsible for all movement.

If vehicles are postponed, make the world traversable on foot and design the architecture to support vehicles later.

---

# 13. AUDIO AND CINEMATIC PRESENTATION

Use sound to create awareness, tension, and spatial understanding.

Implement:

* Footsteps.
* Weapon firing.
* Reloading.
* Impacts.
* Environmental ambience.
* Distant combat.
* Radio communication.
* Enemy alerts.
* Friendly dialogue.
* Mission-completion feedback.
* Menu and interaction audio.

Audio should communicate relevant events without overwhelming the player.

Use spatial audio where supported.

Create a consistent visual direction with:

* Atmospheric lighting.
* Readable silhouettes.
* Environmental depth.
* Clear weapon presentation.
* Distinct faction identities.
* Appropriate weather and time-of-day systems.
* Controlled visual effects.
* Cinematic framing for important story events.

Prioritize a cohesive art direction over expensive effects that do not improve the experience.

Do not use temporary placeholder shapes as the final presentation while describing the game as visually complete.

Clearly label placeholders during development and establish a replacement plan.

---

# 14. TECHNICAL ARCHITECTURE

Choose architecture based on the actual requirements, not convenience alone.

Inspect WFM before choosing whether to retain its existing React, TypeScript, Three.js/WebGL architecture or adopt another engine.

Separate the following concerns:

* Rendering.
* Player movement.
* Camera control.
* Weapons and damage.
* Enemy AI.
* Navigation.
* Missions.
* World state.
* Inventory.
* Progression.
* Save and load.
* Audio.
* UI.
* Authentication.
* Backend APIs.
* Telemetry and diagnostics.

Use typed interfaces and explicit system boundaries.

Avoid one enormous game component containing the entire game loop and every gameplay system.

Avoid duplicate sources of truth for health, ammunition, mission progress, and inventory.

Implement a deterministic or reproducible testing path for critical gameplay systems where practical.

Use version control, automated checks, reproducible builds, and clear environment configuration.

Separate development, staging, and production.

Never copy production credentials into staging.

Do not expose secret keys, database credentials, privileged tokens, or server-only authentication secrets to the browser.

Do not allow the client to grant itself rewards, modify another player's profile, or bypass mission requirements.

Use server-side validation for persistent or online state.

---

# 15. SINGLE-PLAYER FIRST; CO-OP LATER

The first release must provide a meaningful single-player experience.

Do not make the entire game dependent on multiplayer servers.

Build a clean separation between local gameplay and services that require network access.

After the single-player loop is stable, evaluate optional cooperative play.

Potential co-op features include:

* Private friend sessions.
* Shared mission objectives.
* Team revives.
* Shared mission rewards.
* Friendly-fire rules.
* Player reconnection.
* Session cleanup.
* Validated progression.
* Host migration or a clearly documented session-recovery policy.

Do not advertise multiplayer until multiple real clients have successfully completed the relevant gameplay loop.

If online sessions are introduced, define how disconnects, server restarts, abandoned sessions, duplicate requests, and interrupted rewards are handled.

Protect player progression from replay abuse and unauthorized reward claims.

---

# 16. MOBILE AND DESKTOP PERFORMANCE

Establish measurable performance targets for the selected platforms.

For a browser-based build, measure actual performance on representative mobile devices and desktop browsers.

For a native or desktop-engine build, define appropriate platform-specific targets.

Use the following as initial goals rather than assumed achievements:

* Aim for 60 FPS on supported midrange and higher-performance target devices.
* Provide a stable lower-performance mode where necessary.
* Keep frame-time spikes under control.
* Limit memory growth during long play sessions.
* Stream world content instead of loading the entire environment into memory.
* Scale shadows, effects, draw distance, texture quality, and resolution according to device capability.
* Prevent runaway background simulations.
* Avoid loading excessive high-resolution assets at startup.
* Keep input responsive during combat.
* Provide visible loading feedback and recover from failed resource loads.

Measure performance before claiming that a target has been met.

Test sustained play, not merely the first few seconds after loading.

For mobile, include thermal behavior, touch usability, memory pressure, battery impact, browser compatibility, and recovery from interrupted sessions in the certification plan.

If a browser-based FPS cannot achieve the desired visual quality and performance on target devices, document the measured limitation and propose a staged technical solution.

Do not conceal performance problems behind unverified claims.

---

# 17. USER EXPERIENCE AND ACCESSIBILITY

Build complete, functional interfaces for:

* Main menu.
* New game and continue.
* Save/load or checkpoint management.
* Pause menu.
* Settings.
* Audio controls.
* Graphics settings where applicable.
* Controls and sensitivity.
* Mission objectives.
* Inventory.
* Weapon selection.
* Map.
* Journal.
* Dialogue.
* Mission success and failure.
* Death and restart.

Every visible control must have a working behavior or be explicitly marked as unavailable.

Provide clear feedback for interactions, damage, mission updates, inventory changes, and progression.

Support readable text, adjustable sensitivity, remappable controls where supported, and accessibility settings appropriate to the platform.

Ensure menus do not accidentally allow the player to move, fire, or trigger interactions in the world.

Do not create a beautiful menu that leads into a broken or empty game.

---

# 18. DEVELOPMENT PHASES

Build in controlled, verifiable stages.

## Phase 0 — Repository and architecture assessment

Inspect WFM and document reusable systems, major risks, rendering constraints, and the proposed architecture for Mission To Earth.

Acceptance criteria:

* Actual repository and branch inspected.
* Existing tests and build commands identified.
* Reusable code classified.
* Major engine and platform decisions documented.
* No destructive changes to WFM.

## Phase 1 — Playable first-person vertical slice

Build one polished, playable environment.

The player must be able to:

* Start the game.
* Enter a 3D world.
* Move and look around.
* Collide with the environment.
* Sprint and crouch.
* Aim and fire a weapon.
* Reload.
* Hit and defeat an enemy.
* Take damage.
* Die and restart.
* Complete a simple combat objective.

Acceptance criteria:

* No simulated gameplay hidden behind static UI.
* Core controls work.
* Collision and damage are functional.
* At least one complete encounter is playable from beginning to end.
* Critical gameplay tests pass.

## Phase 2 — Enemy intelligence and combat quality

Implement patrols, perception, alerting, search, cover, engagement, and defeat behavior.

Acceptance criteria:

* Enemies can detect and lose the player appropriately.
* Enemies do not see through walls under ordinary conditions.
* Enemies can navigate the actual environment.
* Weapon damage and ammunition behave consistently.
* Encounter behavior is reproducible enough for debugging.

## Phase 3 — Mission framework and cinematic introduction

Build a complete introductory mission with narrative context, objectives, dialogue or radio communication, combat, and a reliable completion sequence.

Acceptance criteria:

* Mission states are valid and recoverable.
* Objectives react to actual gameplay.
* Failure and completion conditions work.
* Cutscenes transition back to gameplay correctly.
* Mission completion is saved correctly.

## Phase 4 — Connected open-world region

Expand the playable environment with additional locations, traversable routes, points of interest, optional activities, and world interactions.

Acceptance criteria:

* Multiple locations are genuinely connected.
* The player can travel between them.
* Navigation works.
* World streaming and memory behavior are measured.
* Exploration reveals useful gameplay or narrative content.

## Phase 5 — Persistence and progression

Implement reliable saves, inventory persistence, unlocks, and consequential world-state changes.

Acceptance criteria:

* Progress survives a game restart.
* Invalid or duplicated rewards are rejected.
* Save/load does not create impossible mission states.
* Player data remains associated with the correct account where accounts are used.
* Development and staging data remain isolated from production.

## Phase 6 — Campaign expansion

Build additional main missions, side missions, character interactions, and consequential world events.

Acceptance criteria:

* Each delivered mission is playable.
* Mission dependencies work.
* Important outcomes persist.
* The campaign has a coherent narrative progression.
* No mission is counted as complete merely because it exists in a menu.

## Phase 7 — Vehicles, advanced systems, and optional co-op

Introduce these features only when the earlier gameplay foundations are stable.

Acceptance criteria:

* Each introduced feature has a complete playable loop.
* Core single-player gameplay remains functional.
* Online features pass real-client tests before being certified.

## Phase 8 — Performance, compatibility, and release readiness

Run automated tests, build checks, gameplay regression tests, security checks, and target-device testing.

Acceptance criteria:

* Reproducible successful builds.
* Critical gameplay tests pass.
* Sustained performance is measured.
* Memory behavior is measured.
* Save/load and progression are verified.
* Supported input methods are tested.
* Deployment and rollback procedures are documented.
* Remaining limitations are disclosed.

---

# 19. TESTING REQUIREMENTS

Create automated tests for the highest-risk systems.

Include tests for:

* Player health and damage.
* Weapon ammunition.
* Reloading.
* Weapon switching.
* Collision and hit detection.
* Enemy perception.
* AI state transitions.
* Mission prerequisites.
* Objective completion.
* Mission failure.
* Save/load.
* Inventory updates.
* Progression unlocks.
* Reward validation.
* Duplicate mission claims.
* World-state changes.
* Resource cleanup.
* Repeated game restarts.
* Invalid inputs.
* Network failures if online features exist.

Where possible, add end-to-end tests that launch the game and verify real interactions.

Do not treat unit tests as proof that the full game works.

Maintain a verification report that distinguishes:

* Implemented.
* Automated-test verified.
* Manually verified.
* Tested on target hardware.
* Not yet verified.
* Known limitations.

Never report a feature as production-ready simply because the code compiles.

---

# 20. DELIVERY REQUIREMENTS

At each phase, deliver:

1. The actual working implementation.
2. A summary of what changed.
3. A list of playable features.
4. Build and test results.
5. Known bugs and limitations.
6. Performance measurements where relevant.
7. Screenshots or recorded gameplay evidence when available.
8. The next highest-priority tasks.

Keep the project in a buildable state.

Do not remove working functionality merely to make a new feature easier to implement.

Do not silently replace complex systems with placeholders.

Do not claim success when a build or test fails.

When a requirement cannot be completed, explain the blocker and implement the most useful verified portion that can be completed safely.

### FINAL DIRECTIVE

Begin with Phase 0.

Inspect the real WAR FOR MARS repository and produce a concise, evidence-based architecture assessment. Then implement Phase 1 as an actual playable first-person shooter vertical slice.

Do not attempt to build the entire open world in one unverified generation.

Prioritize the smallest complete experience that proves the essential gameplay: movement, aiming, shooting, enemy intelligence, damage, objectives, and a satisfying encounter.

Once that experience is working and verified, expand it into Mission To Earth's connected world, cinematic campaign, persistent progression, and advanced systems.

**Build the game, test the game, measure the game, and report the truth about what works.**

---

## 3. My expert recommendations before you start building

The master prompt is important, but the order of implementation will determine whether the project succeeds.

### A. Choose the right engine strategy

WFM is a React/TypeScript/Three.js/WebGL game. That is useful for a browser-accessible game and a practical development foundation. However, a cinematic open-world FPS has substantially different technical demands from a space-combat game.

| Requirement    | WFM foundation                                   | Mission To Earth requirement                                                        |
| -------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| 3D rendering   | Existing 3D browser rendering                    | Detailed first-person world with carefully managed rendering cost                   |
| Movement       | Space-combat movement patterns                   | Collision-aware walking, sprinting, crouching, jumping, and traversal               |
| Combat         | Space weapons and combat                         | First-person aiming, recoil, reloads, hits, cover, and weapon-specific handling     |
| Enemy behavior | Space-combat AI foundations                      | Navigation, perception, squad tactics, cover, searching, and flanking               |
| World          | Space locations and campaign foundations         | Connected terrestrial environments, buildings, roads, and exploration               |
| Persistence    | Existing progression and world-state foundations | Campaign saves, inventory, mission outcomes, and world-state changes                |
| Cinematics     | Campaign foundations                             | First-person storytelling, character dialogue, scripted encounters, and transitions |

**My recommendation:** retain WFM's proven backend and progression concepts where appropriate, but run a rendering and gameplay feasibility test before deciding whether Three.js should power the final Mission To Earth experience.

If cinematic fidelity is the overriding goal, evaluate whether a dedicated game engine such as Unreal Engine 5 is a better fit. If browser accessibility, rapid iteration, and mobile reach are more important, first prove how much of the desired experience the existing technology can deliver.

Do not migrate simply because Unreal Engine is powerful. Make the decision based on a working vertical slice, target hardware, development cost, and measured performance.

### B. Build one excellent mission before a massive world

Your first milestone should be a **10–15-minute playable mission**, not a promise of hundreds of square miles of explorable terrain.

It should contain:

1. A cinematic opening.
2. A traversable outdoor environment.
3. A functioning first-person controller.
4. Two or three intelligent enemy encounters.
5. At least two distinct weapons.
6. A meaningful objective.
7. A scripted story event.
8. A mission-completion sequence.
9. A working save and restart loop.

This single mission will reveal more about the game's actual quality than a large map populated by placeholders.

### C. Treat enemy AI as a core feature

Many AI-generated FPS projects have enemies that stand in place, move toward the player, and absorb bullets. That is not sufficient for the vision.

Prioritize **enemy perception, navigation, searching, cover, squad coordination, and believable reactions** before adding dozens of enemy types.

### D. Make the world persistent without simulating everything

Mission To Earth should remember meaningful consequences: liberated settlements, discovered intelligence, rescued characters, completed operations, and unlocked equipment.

It does not need to simulate every civilian and soldier on the planet at every moment. Use detailed simulation near the player and efficient world-state updates for distant regions.

### E. Make single-player excellent before multiplayer

Start with single-player. Establish movement, combat, AI, mission logic, saving, and performance before introducing network synchronization and cooperative play.

WFM's online foundations can inform a later co-op implementation, but they should not force unnecessary multiplayer complexity into the first playable build.

---

## 4. The follow-up prompt I would use after the first generation

Once the AI produces its initial implementation, do not simply ask it to "make the game better." Give it a verification task that forces it to distinguish real functionality from appearances.

Act as an independent senior FPS gameplay engineer and QA lead.

Audit the actual current Mission To Earth implementation. Do not rely on the previous AI agent's claims or documentation without verification.

Run the available build, typecheck, automated tests, and playable application.

Verify the following through actual gameplay or end-to-end tests wherever possible:

1. Can a player enter a 3D environment and move using collision-aware first-person controls?
2. Can the player aim, fire, reload, switch weapons, and manage ammunition?
3. Do bullets and projectiles correctly detect targets and apply damage?
4. Can enemies detect the player, lose sight, investigate, navigate, and engage?
5. Can the player complete a real objective through gameplay?
6. Do mission success and failure conditions work?
7. Do save, load, death, and restart behave correctly?
8. Does progression survive an application restart?
9. Does the environment contain meaningful explorable locations rather than disconnected decorative scenes?
10. Do the world and mission systems react to actual player actions?
11. Are any visible controls nonfunctional?
12. Are there crashes, console errors, resource leaks, broken transitions, or major frame-rate problems?

For every requirement, classify the result as PASS, FAIL, PARTIAL, or NOT TESTED.

Provide the evidence supporting each result, the reproduction steps for each failure, and the highest-priority fixes.

Separate code-level verification from actual gameplay verification. Do not classify an untested feature as passing.

Fix critical failures when it is safe to do so, rerun the relevant tests, and report the final result.

Do not expand the feature list until the core playable loop is verified.

---

## 5. The final strategic decision

I would build Mission To Earth in this order:

**Playable first-person combat → intelligent enemies → complete cinematic mission → connected explorable region → persistent world → larger campaign → vehicles → optional co-op.**

That order protects the project from becoming an attractive collection of incomplete features.

The most important question is not how many features the AI can generate. It is whether the AI can build a cohesive game in which movement, weapons, enemies, missions, world state, and progression actually work together.

**My recommendation:** use WAR FOR MARS as the technical starting point, establish Mission To Earth as a separate product, and make the first deliverable a genuinely playable cinematic FPS mission. Expand the world only after that mission proves the architecture and gameplay.
