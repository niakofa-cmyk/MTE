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
    <CinderRowPanel {...baseProps} rankedProfileId="cinder-row-relay-8v8" />,
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
  assert.match(eightVsEightMenu, /up to 8 operators per side/);
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
