import { t } from '@opes/i18n';

export default function Home() {
  return (
    <main className="screen">
      <div className="card">
        <h1>{t('play.home.heading')}</h1>
        <p>{t('play.home.lead')}</p>
      </div>
    </main>
  );
}
