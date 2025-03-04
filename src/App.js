// Base styles for media player and provider (~400B).
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/audio.css';
import './App.css'
import { MediaPlayer, MediaProvider } from '@vidstack/react';
import { DefaultAudioLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default';
import { useEffect, useState } from 'react';
import ColorThief from 'colorthief';

// Função para formatar segundos em MM:SS
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

export default function App() {
    const [track, setTrack] = useState(undefined);
    
    async function ftch() {
        const tr = await fetch("https://api.hunter.fm/station/jic321Sd-dawd1S27s-Se24s1daw2/live");
        const tra = await tr.json();
        setTrack(tra);
    }

    useEffect(() => {
        ftch();
        const interval = setInterval(ftch, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (track && track.now.hashThumb) {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = `https://cdn.hunter.fm/image/thumb/music/${track.now.hashThumb}/400x400ht.jpg`;
            
            img.onload = () => {
                const colorThief = new ColorThief();
                const [r, g, b] = colorThief.getColor(img);
                document.documentElement.style.setProperty('--album-accent', `rgb(${r}, ${g}, ${b})`);
            };
        }
    }, [track]);

    // Calcula o tempo decorrido
    const elapsedSeconds = track 
      ? Math.floor((new Date(track.timestamp) - new Date(track.now.time.start)) / 1000)
      : 0;

    return (
        <div className="back">
            <img className="albumImage" src={`https://cdn.hunter.fm/image/thumb/music/${track&&track.now.hashThumb}/400x400ht.jpg`} />
            <p className="trackName">{track&&track.now.name}</p>
            <p className="trackArtist">{track&&track.now.singers.join(", ")}</p>
            
            <div className="time-display">
                <span className="elapsed">{formatTime(elapsedSeconds)}</span>
                <span className="duration">{track && formatTime(track.now.info.duration)}</span>
            </div>

            <progress 
                className="progressBar" 
                value={elapsedSeconds} 
                max={track&&track.now.info.duration}
            ></progress>

            <MediaPlayer 
                className='media-player' 
                autoPlay={true} 
                viewType="audio" 
                load="visible" 
                poster={`https://cdn.hunter.fm/image/thumb/music/${track&&track.now.hashThumb}/400x400ht.jpg`} 
                title={track&&track.now.name} 
                artist={track&&track.now.singers.join(", ")} 
                src={[
                    { src: "https://live.hunter.fm/rock_high" },
                    { src: "https://live.hunter.fm/rock_normal" },
                    { src: "https://live.hunter.fm/rock_low" }
                ]}>
                <MediaProvider />
                <DefaultAudioLayout icons={defaultLayoutIcons} />
            </MediaPlayer>
        </div>
    )
}