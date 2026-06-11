type MarineAuthority = 'Environment Canada' | 'National Weather Service' | 'both' | string;

type SiteFooterProps = {
  showIndependenceDisclosure?: boolean;
  includeMarineAdvisories?: boolean;
  marineAuthority?: MarineAuthority;
  includeTides?: boolean;
};

export default function SiteFooter({
  showIndependenceDisclosure = false,
  includeMarineAdvisories = true,
  marineAuthority = 'both',
  includeTides = true
}: SiteFooterProps) {
  return (
    <footer className="siteFooter">
      {showIndependenceDisclosure ? (
        <p className="independenceDisclosure">
          Fair Tide is an independent planning tool and is not affiliated with or endorsed by{' '}
          <a href="https://www.freedomboatclub.com/" target="_blank" rel="noreferrer">
            Freedom Boat Club
          </a>{' '}
          or any marina operator.
        </p>
      ) : null}
      <section className="sourceLegend" aria-label="Data sources">
        <div className="sourceLegendTitle">Data sources</div>
        <ul className="sourceLegendList">
          <li>
            <span>Conditions + forecast</span>
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo Forecast API</a>
          </li>
          {includeMarineAdvisories ? (
            <li>
              <span>Marine advisories</span>
              <MarineAdvisorySources authority={marineAuthority} />
            </li>
          ) : null}
          {includeTides ? (
            <li>
              <span>Tides, currents + water levels</span>
              <span className="sourceLegendLinks">
                <a href="https://api-iwls.dfo-mpo.gc.ca/" target="_blank" rel="noreferrer">DFO / Canadian Hydrographic Service IWLS</a>
                <span className="sourceLegendSourceBreak" aria-hidden="true" />
                <a href="https://tidesandcurrents.noaa.gov/" target="_blank" rel="noreferrer">NOAA Tides & Currents</a>
              </span>
            </li>
          ) : null}
        </ul>
      </section>
      <div className="footerBrandRow">
        <span>© {new Date().getFullYear()}</span>
        <a className="baBadge baBadgeWhite" href="https://www.b-average.com/" target="_blank" rel="noreferrer">B AVERAGE</a>
        <a className="footerLink" href="/contact">Contact</a>
      </div>
    </footer>
  );
}

function MarineAdvisorySources({ authority }: { authority: MarineAuthority }) {
  if (authority === 'Environment Canada') {
    return <a href="https://weather.gc.ca/" target="_blank" rel="noreferrer">Environment Canada warnings</a>;
  }

  if (authority === 'National Weather Service') {
    return <a href="https://api.weather.gov/alerts/active" target="_blank" rel="noreferrer">National Weather Service active alerts</a>;
  }

  return (
    <span className="sourceLegendLinks">
      <a href="https://weather.gc.ca/" target="_blank" rel="noreferrer">Environment Canada warnings</a>
      <span aria-hidden="true"> · </span>
      <a href="https://api.weather.gov/alerts/active" target="_blank" rel="noreferrer">National Weather Service active alerts</a>
    </span>
  );
}
