// App.js
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaPlayer, MediaProvider } from '@vidstack/react';
import { DefaultAudioLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default';
import { Client } from 'lrclib-api';
import './App.css';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/audio.css';

const client = new Client();

// Formata segundos para mm:ss
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

// Componente de letras sincronizadas com foco na linha ativa
const SyncedLyrics = ({ lyrics, elapsedSeconds }) => {
  const activeRef = useRef(null);
  
  // Calcula qual linha é a ativa com base no tempo (startTime em ms)
  const activeIndex = useMemo(() => {
    let index = 0;
    for (let i = 0; i < lyrics.length; i++) {
      if (elapsedSeconds >= lyrics[i].startTime) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }, [lyrics, elapsedSeconds]);

  // Sempre que a linha ativa mudar, faz scroll para ela
  useEffect(() => {
    if (activeRef.current) {
     // activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIndex]);
  return (
    <div className="lyrics-container">
      {lyrics.map((line, index) => (
        <motion.div
          key={index}
          ref={index === activeIndex ? activeRef : null}
          className={`lyric-line ${index === activeIndex ? 'lyric-active' : ''}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: index === activeIndex ? 1 : 0.6, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {line.text}
        </motion.div>
      ))}
    </div>
  );
};

const App = () => {
  const [liveData, setLiveData] = useState(null);
  const [lyrics, setLyrics] = useState([]);

  // Busca os dados ao vivo da endpoint
  const fetchLiveData = async () => {
    try {
      const res = await fetch('https://api.hunter.fm/station/jic321Sd-dawd1S27s-Se24s1daw2/live');
      const data = await res.json();
      setLiveData(data);
    } catch (error) {
      console.error('Erro ao buscar dados ao vivo:', error);
    }
  };

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sempre que a faixa atual mudar, busca as letras sincronizadas via lrclib-api
  useEffect(() => {
    const fetchLyrics = async () => {
      if (liveData && liveData.now) {
        try {
          const query = {
            track_name: liveData.now.name,
            artist_name: liveData.now.singers[0],
          };
          const metadata = await client.findLyrics(query);
          if (metadata) {
            const synced = await client.getSynced({
              track_name: metadata.trackName,
              artist_name: metadata.artistName,
            });
            setLyrics(synced || []);
          } else {
            setLyrics([]);
          }
        } catch (error) {
          console.error('Erro ao buscar letras sincronizadas:', error);
          setLyrics([]);
        }
      }
    };
    fetchLyrics();
  }, [liveData, liveData?.now?.hash]);

  if (!liveData) {
    return <div className="loading">Carregando dados ao vivo...</div>;
  }

  const { now, next, history, timestamp } = liveData;

  // Calcula tempo decorrido (em segundos) desde o início da faixa atual
  const elapsedSeconds = now?.time?.start
    ? Math.floor((new Date(timestamp) - new Date(now.time.start)) / 1000) - 25
    : 0;
  
  // Calcula porcentagem de progresso da faixa
  const progressPercent = now?.info?.duration
    ? Math.min((elapsedSeconds / now.info.duration) * 100, 100)
    : 0;

  return (
    <div className="live-radio-layout">
      {/* Faixa Atual */}
      <div className="current-track">
        <AnimatePresence>
          {now.hashThumb && (
            <motion.div
              className="album-art"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.5 }}
            >
              <img
                src={`https://cdn.hunter.fm/image/thumb/music/${now.hashThumb}/400x400ht.jpg`}
                alt="Capa do Álbum"
                className="album-image"
              />
            </motion.div>
          )}
        </AnimatePresence>
        <div className="track-info">
          <h1 className="track-name">{now.name}</h1>
          <p className="track-artist">{now.singers.join(', ')}</p>
          <span className="live-badge">AO VIVO</span>
          <div className="progress-container">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="time-display">
              <span>{formatTime(elapsedSeconds)}</span>
              <span>{now.info.duration ? formatTime(now.info.duration) : '00:00'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Player de Áudio */}
      <div className="audio-player">
        <MediaPlayer autoPlay src="https://live.hunter.fm/rock_high">
          <MediaProvider />
          <DefaultAudioLayout icons={defaultLayoutIcons} />
        </MediaPlayer>
      </div>

      {/* Letras Sincronizadas */}
      {lyrics.length > 0 && <SyncedLyrics lyrics={lyrics} elapsedSeconds={elapsedSeconds} />}

      {/* Próxima Faixa */}
      <div className="next-track">
        <h2>Próxima Faixa</h2>
        {next ? (
          <div className="next-track-info">
            {next.hashThumb && (
              <img
                src={`https://cdn.hunter.fm/image/thumb/music/${next.hashThumb}/200x200ht.jpg`}
                alt="Capa da próxima faixa"
                className="next-album-image"
              />
            )}
            <div>
              <h3>{next.name}</h3>
              <p>{next.singers.join(', ')}</p>
            </div>
          </div>
        ) : (
          <p>Sem informação da próxima faixa</p>
        )}
      </div>

      {/* Histórico */}
      <div className="track-history">
        <h2>Histórico</h2>
        <ul>
          {history && history.map((item, index) => (
            <li key={index}>
              <strong>{item.name}</strong> – {item.singers.join(', ')}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default App;
