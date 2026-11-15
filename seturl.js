// Convert a normal YouTube/Spotify URL into an embed URL
function getEmbedUrl(url) {
    try {
        const parsed = new URL(url);

        if (parsed.hostname.includes("youtube.com")) {
            const id = parsed.searchParams.get("v")
                || parsed.pathname.match(/\/(shorts|embed|live)\/([\w-]+)/)?.[2];
            if (id) return `https://www.youtube.com/embed/${id}`;
        }
        if (parsed.hostname === "youtu.be") {
            return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`;
        }

        if (parsed.hostname.includes("open.spotify.com")) {
            return `https://open.spotify.com/embed${parsed.pathname}`;
        }
    } catch {
        // not a valid URL
    }
    return null;
}

// Get the track title — Spotify via its oEmbed (no artist available),
// YouTube via noembed with "Artist - Song" parsing
async function getTrackTitle(url) {
    if (url.includes("spotify.com")) {
        const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        if (!data.title) throw new Error("no title");
        return data.title;
    }

    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    const [artist, song] = (data.title || "").split(" - ");
    if (!artist || !song) throw new Error("couldn't parse title");
    return `${artist.trim()} - ${song.trim()}`;
}

// Fetch lyrics from LRCLIB — direct lookup if we know the artist,
// title-only search as fallback (needed for Spotify)
async function getLyrics(title) {
    const res = await fetch(
        `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}`
    );
    if (!res.ok) return null;
    const results = await res.json();
    if (!Array.isArray(results) || results.length === 0) return null;

    // prefer an exact title match that actually has lyrics
    const match = results.find(r => r.plainLyrics
        && r.trackName.toLowerCase() === title.toLowerCase())
        || results.find(r => r.plainLyrics)
        || results[0];

    return {
        artist: match.artistName,
        lyrics: match.plainLyrics || match.syncedLyrics || null
    };
}

document.querySelector(".search-bar").addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = e.target.url.value.trim();
    const lyricsDiv = document.getElementById("lyrics");
    const embed = getEmbedUrl(url);

    if (!embed) {
        lyricsDiv.textContent = "That doesn't look like a valid YouTube or Spotify link.";
        return;
    }

    document.querySelector("iframe").src = embed;
    lyricsDiv.textContent = "Fetching lyrics...";

    if (url.includes("spotify.com/album") || url.includes("spotify.com/playlist")) {
        lyricsDiv.textContent = "That's an album/playlist — paste a single track link instead (Share → Copy link on the song).";
        return;
    }

    try {
        // title is just the song name for Spotify, "Artist - Song" for YouTube
        const fullTitle = await getTrackTitle(url);
        const title = fullTitle.includes(" - ")
            ? fullTitle.split(" - ").slice(1).join(" - ").trim()  // song part only
            : fullTitle;

        const result = await getLyrics(title);
        if (result?.lyrics) {
            lyricsDiv.textContent = result.lyrics;
        } else {
            lyricsDiv.textContent = `No lyrics found for "${fullTitle}" 😢`;
        }
    } catch {
        lyricsDiv.textContent = "Couldn't figure out the song or load lyrics. Try again.";
    }
});