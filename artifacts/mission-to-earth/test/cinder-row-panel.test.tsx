import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CinderRowPanel, type CinderRowPanelProps } from "../src/game/CinderRowPanel.tsx";

Object.assign(globalThis, { React });

const baseProps: CinderRowPanelProps = {
  screen: "hud",
  serverStatus: "connected",
  serverMessage: null,
  matchId: "panel-test-match",
  maxPlayers: 8,
  players: [],
  joinCode: "",
  onJoinCodeChange: () => undefined,
  onRankedProfileChange: () => undefined,
  team: "accord",
  rankedQueue: { state: "matched", rating: 1_000 },
  rankedProfileId: "cinder-row-relay-4v4",
  round: {
    phase: "active",
    remainingSeconds: 120,
    relayProgress: 25,
    controlledBy: "accord",
    contested: false,
    accordPlayers: 3,
    duskPlayers: 7,
    winner: null,
  },
  onHost: () => undefined,
  onJoin: () => undefined,
  onCopyMatchId: () => undefined,
  onRankedAction: () => undefined,
};

test("Cinder Row HUD shows the selected ranked team capacity", () => {
  const fourVsFour = renderToStaticMarkup(
    <CinderRowPanel {...baseProps} rankedProfileId="cinder-row-relay-4v4" />,
  );
  const eightVsEight = renderToStaticMarkup(
    <CinderRowPanel
      {...baseProps}
      maxPlayers={16}
      rankedProfileId="cinder-row-relay-8v8"
    />,
  );
  const eightVsEightMenu = renderToStaticMarkup(
    <CinderRowPanel
      {...baseProps}
      screen="menu"
      rankedProfileId="cinder-row-relay-8v8"
    />,
  );

  assert.match(fourVsFour, /\/4/);
  assert.match(eightVsEight, /\/8/);
  assert.match(eightVsEightMenu, /Private matches are 4v4; ranked supports 4v4 or 8v8/);
});

test("Cinder Row touch HUD starts collapsed and exposes the round panel on demand", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: { matchMedia: () => ({ matches: true }) },
  });
  try {
    const compactHud = renderToStaticMarkup(<CinderRowPanel {...baseProps} />);
    assert.match(compactHud, /data-testid="cinder-row-hud-toggle"[^>]*aria-expanded="false"/);
    assert.doesNotMatch(compactHud, /ROUND TIME/);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("explains private match creation and exposes a shareable ID after hosting", () => {
  const readyToHost = renderToStaticMarkup(
    <CinderRowPanel
      {...baseProps}
      screen="menu"
      serverStatus="idle"
      matchId={null}
      rankedQueue={{ state: "idle", rating: 1_000 }}
    />,
  );
  const hostedMatch = renderToStaticMarkup(
    <CinderRowPanel
      {...baseProps}
      screen="menu"
      matchId="invite-match-123"
      rankedQueue={{ state: "idle", rating: 1_000 }}
    />,
  );

  assert.match(readyToHost, /CREATE PRIVATE MATCH/);
  assert.match(readyToHost, /Custom matches are unranked/);
  assert.match(readyToHost, /PASTE MATCH ID/);
  assert.match(hostedMatch, /PRIVATE MATCH ID/);
  assert.match(hostedMatch, /invite-match-123/);
  assert.match(hostedMatch, /aria-label="Copy Match ID"/);
});

test("shows server-assigned players, teams, capacity, and connection state", () => {
  const roster = renderToStaticMarkup(
    <CinderRowPanel
      {...baseProps}
      screen="menu"
      matchId="invite-match-123"
      maxPlayers={16}
      players={[
        {
          playerId: "accord-player-1234",
          operatorId: "jaya",
          team: "accord",
          connected: true,
        },
        {
          playerId: "dusk-player-5678",
          operatorId: "khensu",
          team: "eon-dusk",
          connected: false,
        },
      ]}
      rankedQueue={{ state: "idle", rating: 1_000 }}
    />,
  );

  assert.match(roster, /MATCH ROSTER/);
  assert.match(roster, /1\/16 JOINED/);
  assert.match(roster, /JAYA/);
  assert.match(roster, /#ACCORD/);
  assert.match(roster, /KHENSU/);
  assert.match(roster, /#DUSK-P/);
  assert.match(roster, /0\/8/);
  assert.match(roster, /OFFLINE/);
});
