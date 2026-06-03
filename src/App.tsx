import { useState } from "react";
import { useGame } from "./hooks/useGame";
import { Onboarding } from "./components/Onboarding";
import { TopBar } from "./components/TopBar";
import { PetStage } from "./components/PetStage";
import { StatBars } from "./components/StatBars";
import { HabitList } from "./components/HabitList";
import { Quests } from "./components/Quests";
import { Shop } from "./components/Shop";
import { Awards } from "./components/Awards";
import { Toasts } from "./components/Toasts";
import { SettingsModal } from "./components/SettingsModal";

type Tab = "home" | "shop" | "awards";

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "home", icon: "🏠", label: "Home" },
  { id: "shop", icon: "🎁", label: "Shop" },
  { id: "awards", icon: "🏆", label: "Awards" },
];

export default function App() {
  const { state, toasts, heartPulse, sparklePulse, actions } = useGame();
  const [tab, setTab] = useState<Tab>("home");
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!state.onboarded) {
    return (
      <div className="app">
        <Onboarding onDone={actions.onboard} />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="phone">
        <TopBar state={state} onSettings={() => setSettingsOpen(true)} />

        <main className="content">
          {tab === "home" && (
            <>
              <PetStage
                state={state}
                heartPulse={heartPulse}
                sparklePulse={sparklePulse}
                onPet={actions.petPet}
              />
              <StatBars pet={state.pet} />
              <Quests state={state} onClaim={actions.claimQuest} />
              <HabitList
                state={state}
                onToggle={actions.toggleHabit}
                onAdd={actions.addHabit}
                onEdit={actions.editHabit}
                onArchive={actions.archiveHabit}
              />
            </>
          )}
          {tab === "shop" && <Shop state={state} onBuy={actions.buy} />}
          {tab === "awards" && <Awards state={state} />}
        </main>

        <nav className="tabbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <span className="tab-icon">{t.icon}</span>
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <Toasts toasts={toasts} />
      {settingsOpen && (
        <SettingsModal
          state={state}
          onClose={() => setSettingsOpen(false)}
          onChange={actions.setSettings}
          onReset={actions.resetGame}
        />
      )}
    </div>
  );
}
