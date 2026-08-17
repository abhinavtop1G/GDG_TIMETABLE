import { useState } from "react";
import {
  DAY_NAMES,
  baseCode,
  electiveGroups,
  formatTime,
  type Batch,
  type Choice,
  type ElectiveGroup,
  type Picks,
} from "../lib/data";

interface Props {
  batch: Batch;
  picks: Picks;
  onChange: (picks: Picks) => void;
  onClose: () => void;
}

export default function ElectivePicker({ batch, picks, onChange, onClose }: Props) {
  const groups = electiveGroups(batch);
  const [openGroup, setOpenGroup] = useState<string | null>(
    groups.find((g) => !picks[g.key])?.key ?? groups[0]?.key ?? null,
  );

  function choose(group: ElectiveGroup, choice: Choice | null) {
    const next = { ...picks };
    if (choice) next[group.key] = baseCode(choice.code);
    else delete next[group.key];
    onChange(next);
  }

  return (
    <div className="detail" role="dialog" aria-modal="true" aria-label="Choose your electives">
      <button className="detail__scrim" onClick={onClose} aria-label="Close" />

      <article className="detail__panel elective">
        <header className="detail__head">
          <div className="detail__badges">
            <span className="detail__kind elective__kind">Electives</span>
            <span className="detail__code">{batch.id}</span>
          </div>
          <h2 className="detail__title">Which electives are you taking?</h2>
          <p className="detail__dept">
            These are the only options open to your batch — taken straight from
            your own timetable. Pick one per slot and your week fills in with
            the right room and teacher.
          </p>
        </header>

        {groups.length === 0 && (
          <p className="detail__about">
            Your batch has no elective slots this semester. Nothing to choose.
          </p>
        )}

        {groups.map((group, gi) => {
          const picked = picks[group.key];
          const isOpen = openGroup === group.key;
          const pickedChoice = group.choices.find((c) => baseCode(c.code) === picked);

          return (
            <section key={group.key} className="egroup">
              <button
                className="egroup__head"
                onClick={() => setOpenGroup(isOpen ? null : group.key)}
                aria-expanded={isOpen}
              >
                <span className="egroup__n">{gi + 1}</span>
                <span className="egroup__meta">
                  <span className="egroup__title">
                    {pickedChoice
                      ? pickedChoice.title || pickedChoice.code
                      : `Choose from ${group.choices.length} courses`}
                  </span>
                  <span className="egroup__when">
                    {group.slots
                      .map((s) => `${DAY_NAMES[s.day].slice(0, 3)} ${formatTime(s.start)}`)
                      .join(" · ")}
                  </span>
                </span>
                <span className={`egroup__state ${picked ? "egroup__state--set" : ""}`}>
                  {picked ? "Chosen" : "Pick"}
                </span>
              </button>

              {!group.aligned && (
                <p className="egroup__warn">
                  The sheet lists these options without matching rooms one-to-one,
                  so we won't show a room for this slot. Check with your
                  department before the first class.
                </p>
              )}

              {isOpen && (
                <ul className="echoices">
                  {group.choices.map((c) => {
                    const on = baseCode(c.code) === picked;
                    return (
                      <li key={c.code}>
                        <button
                          className={`echoice ${on ? "echoice--on" : ""}`}
                          onClick={() => choose(group, on ? null : c)}
                        >
                          <span className="echoice__main">
                            <span className="echoice__title">{c.title || c.code}</span>
                            <span className="echoice__code">{c.code}</span>
                          </span>
                          <span className="echoice__meta">
                            {group.aligned && c.room && (
                              <span className="echoice__room">{c.room}</span>
                            )}
                            {group.aligned && !c.room && (
                              <span className="echoice__none">no room listed</span>
                            )}
                            {group.aligned && c.faculty && (
                              <span className="echoice__fac">{c.faculty}</span>
                            )}
                          </span>
                          <span className="echoice__tick" aria-hidden="true">
                            {on ? "✓" : ""}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}

        <p className="elective__fine">
          Saved on this device only. Your picks never leave your phone.
        </p>

        <button className="pill pill--go detail__close" onClick={onClose}>
          Done
        </button>
      </article>
    </div>
  );
}
