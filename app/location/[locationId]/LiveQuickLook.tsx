'use client';

import { useEffect, useState } from 'react';
import {
  getBestLaunchWindowSummary,
  getLiveLocalIso,
  getSlackTideSummary,
  type ForecastAlertHour,
  type QuickSummary
} from '../../../lib/conditions-time';
import { IconClock, IconTide } from './icons';

type TideEvent = { t: string; kind: 'high' | 'low'; heightM?: number };
type SunDay = { day: string; sunrise?: string; sunset?: string };
type QuickTone = 'toneGood' | 'toneWarn' | 'toneBad' | 'toneInfo';

function quickToneClass(tone?: string | null): QuickTone {
  if (tone === 'toneBad') return 'toneBad';
  if (tone === 'toneWarn') return 'toneWarn';
  if (tone === 'toneInfo') return 'toneInfo';
  return 'toneGood';
}

function quickValueClass(tone?: string | null): string {
  const toneClass = quickToneClass(tone);
  return toneClass === 'toneInfo' ? `${toneClass} value--neutral` : toneClass;
}

export default function LiveQuickLook({
  timeZone,
  forecast,
  sunByDay,
  sunriseIso,
  sunsetIso,
  tideEvents,
  isTidal,
  serverLaunch,
  serverSlack
}: {
  timeZone: string;
  forecast: ForecastAlertHour[];
  sunByDay: SunDay[];
  sunriseIso?: string;
  sunsetIso?: string;
  tideEvents: TideEvent[];
  isTidal: boolean;
  serverLaunch: QuickSummary;
  serverSlack: QuickSummary | null;
}) {
  const [launch, setLaunch] = useState<QuickSummary>(serverLaunch);
  const [slack, setSlack] = useState<QuickSummary | null>(serverSlack);

  useEffect(() => {
    const recompute = () => {
      const nowIso = getLiveLocalIso(timeZone);
      setLaunch(getBestLaunchWindowSummary({
        forecast,
        nowIso,
        sunriseIso,
        sunsetIso,
        sunByDay
      }));
      setSlack(isTidal ? getSlackTideSummary({ nowIso, events: tideEvents }) : null);
    };

    recompute();
    const id = window.setInterval(recompute, 60_000);
    return () => window.clearInterval(id);
  }, [forecast, isTidal, serverSlack, sunriseIso, sunsetIso, sunByDay, tideEvents, timeZone]);

  return (
    <>
      <div className={`quickItem ${quickToneClass(launch.tone)}`}>
        <div className="quickLabel">
          <span className="quickIcon"><IconClock /></span>
          <span className="quickLabelDesktop">Best launch window</span>
          <span className="quickLabelMobile">Best window</span>
        </div>
        <div className={`quickValue ${quickValueClass(launch.tone)}`}>{launch.label}</div>
        <div className="miniNote">{launch.detail}</div>
      </div>
      {slack ? (
        <div className={`quickItem ${quickToneClass(slack.tone)}`}>
          <div className="quickLabel"><span className="quickIcon"><IconTide /></span>Slack tide</div>
          <div className={`quickValue ${quickValueClass(slack.tone)}`}>{slack.label}</div>
          <div className="miniNote">{slack.detail}</div>
        </div>
      ) : null}
    </>
  );
}
