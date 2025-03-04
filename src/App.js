// Base styles for media player and provider (~400B).
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/audio.css';
import './App.css';
import { MediaPlayer, MediaProvider } from '@vidstack/react';
import { DefaultAudioLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default';
import { useEffect, useState, useMemo } from 'react';
import ColorThief from 'colorthief';
import { Client } from 'lrclib-api';

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '00:00';
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
};

const client = new Client();

export default function App() {
    const [track, setTrack] = useState(null);
    const [lyrics, setLyrics] = useState(null);
    const [error, setError] = useState(null);

    // Busca dados da música e letras
    const fetchData = async () => {
        try {
            const response = await fetch("https://api.hunter.fm/station/jic321Sd-dawd1S27s-Se24s1daw2/live");
            const data = await response.json();
            setTrack(data);

            if (data.now?.name && data.now?.singers?.length > 0) {
                const lyricsData = await client.findLyrics({
                    track_name: data.now.name,
                    artist_name: data.now.singers[0]
                });
                
                if (lyricsData) {
                    const syncedLyrics = await client.getSynced({
                        track_name: lyricsData.trackName,
                        artist_name: lyricsData.artistName
                    });
                    setLyrics(syncedLyrics?.lyrics || []);
                }
            }
        } catch (err) {
            setError('Erro ao carregar dados');
            console.error(err);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 1000); // Atualiza a cada 10s
        return () => clearInterval(interval);
    }, []);

    // Calcula tempo decorrido
    const elapsedSeconds = track ? (Math.floor((new Date(track.timestamp) - new Date(track.now.time.start)) / 1000)) : 0 ;

    // Filtra letras visíveis
    const visibleLyrics = useMemo(() => {
        if (!lyrics || lyrics.length === 0) return [];
        
        let currentIndex = -1;
        for (let i = 0; i < lyrics.length; i++) {
            if (lyrics[i].startTime <= elapsedSeconds) currentIndex = i;
            else break;
        }

        const start = Math.max(0, currentIndex - 1);
        const end = Math.min(lyrics.length - 1, currentIndex + 1);
        return lyrics.slice(start, end + 1);
    }, [lyrics, elapsedSeconds]);

    // Atualiza cores dinâmicas
    useEffect(() => {
        if (track?.now?.hashThumb) {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = `https://cdn.hunter.fm/image/thumb/music/${track.now.hashThumb}/400x400ht.jpg`;
            
            img.onload = () => {
                const colorThief = new ColorThief();
                const [r, g, b] = colorThief.getColor(img);
                document.documentElement.style.setProperty('--album-accent', `rgb(${r},${g},${b})`);
            };
        }
    }, [track]);

    return (
        <div className="back">
            {/* Album Art */}
            <img className="albumImage" 
                 src={`https://cdn.hunter.fm/image/thumb/music/${track?.now?.hashThumb}/400x400ht.jpg`} 
                 alt="Album cover" />

            {/* Track Info */}
            <p className="trackName">{track?.now?.name}</p>
            <p className="trackArtist">{track?.now?.singers?.join(", ")}</p>

            {/* Progress */}
            <div className="time-display">
                <span className="elapsed">{formatTime(elapsedSeconds)}</span>
                <span className="duration">{track && formatTime(track.now.info.duration)}</span>
            </div>
            <progress className="progressBar" 
                      value={elapsedSeconds} 
                      max={track?.now?.info.duration} />

            {/* Player de Áudio */}
            <MediaPlayer className='media-player'
                         autoPlay
                         src="https://live.hunter.fm/rock_high"
                         poster={`https://cdn.hunter.fm/image/thumb/music/${track?.now?.hashThumb}/400x400ht.jpg`}>
                <MediaProvider />
                <DefaultAudioLayout icons={defaultLayoutIcons} />
            </MediaPlayer>

            {/* Letras Sincronizadas */}
            <div className="lyricsContainer">
                {visibleLyrics.map((line, index) => (
                    <p key={`${line.startTime}-${index}`} 
                       className={index === 1 ? 'currentLyric' : 'lyricLine'}>
                        {line.text}
                    </p>
                ))}
                {error && <p className="errorMessage">{error}</p>}
            </div>
        </div>
    )
}