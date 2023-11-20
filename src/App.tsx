import { useEffect, useState } from "react";
import "./App.css";
import axios from "axios";
import React from "react";

const POETRY_API = "https://poetrydb.org";
const TTS_API = "https://large-text-to-speech.p.rapidapi.com/tts";
const TTS_API_KEY = "91db0de61amsh72a7bfc1ae30322p1569d4jsn653ad0a05d8e";

async function textToSpeech(text: string, title: string) {
  const headers = {
    "content-type": "application/json",
    "X-RapidAPI-Key": TTS_API_KEY,
    "X-RapidAPI-Host": "large-text-to-speech.p.rapidapi.com",
  };
  try {
    const response = await axios.post(TTS_API, { text }, { headers });
    const result = response.data;
    const { id, eta } = result;
    // const id = "7026efd7-ea23-4bdd-9fec-3d650155184c";
    // const eta = 3;

    const interval = setInterval(async () => {
      if (sessionStorage.getItem(`${title}.wav`)) return;
      const getResult = (await axios.get(`${TTS_API}?id=${id}`, { headers }))
        .data;
      const { status, url } = getResult;
      if (status === "success") {
        const file = await (await fetch(url)).blob();
        sessionStorage.setItem(`${title}.wav`, URL.createObjectURL(file));
        alert("Press recite again!");
        clearInterval(interval);
      } else if (status !== "processing") {
        clearInterval(interval);
      }
    }, eta * 1000);
  } catch (error) {
    console.error(error);
  }
}

function AuthorForm({
  setPoems,
  setNotFound,
  authors,
}: {
  setPoems: React.Dispatch<React.SetStateAction<never[]>>;
  setNotFound: React.Dispatch<React.SetStateAction<boolean>>;
  authors: string[];
}) {
  const [author, setAuthor] = useState("0");

  async function handleClick(
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    e.preventDefault();
    try {
      const res = await axios.get(POETRY_API + `/author/${author}`);
      if (res.data.status && res.data.status === 404) {
        setNotFound(true);
      } else {
        setNotFound(false);
        setPoems(res.data);
      }
    } catch (e) {
      setNotFound(true);
      console.error(e);
    }
  }

  return (
    <form action=''>
      <label htmlFor='author'>
        Author:
        <select
          name='author'
          id='author'
          value={author}
          onChange={(e) => setAuthor(e.target.value as string)}
          required
        >
          <option disabled value='0'>
            Select your author
          </option>
          {authors.map((author, idx) => {
            return (
              <option value={author} key={idx}>
                {author}
              </option>
            );
          })}
        </select>
      </label>
      <button type='submit' onClick={handleClick}>
        Search
      </button>
    </form>
  );
}

function TitleForm({
  setPoems,
  setNotFound,
}: {
  setPoems: React.Dispatch<React.SetStateAction<never[]>>;
  setNotFound: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [title, setTitle] = useState("");

  async function handleClick(
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    e.preventDefault();
    try {
      const res = await axios.get(POETRY_API + `/title/${title}`);
      if (res.data.status && res.data.status === 404) {
        setNotFound(true);
      } else {
        setNotFound(false);
        setPoems(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <form>
      <label htmlFor='title'>
        Poem Title:
        <input
          type='text'
          name='title'
          id='title'
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>
      <button type='submit' onClick={handleClick}>
        Search
      </button>
    </form>
  );
}

function Poem({
  title,
  lines,
  author,
}: {
  title: string;
  lines: string[];
  author: string;
}) {
  const [showLines, setShowLines] = useState(false);
  const [url, setUrl] = useState(
    sessionStorage.getItem(`${title}.wav`) as string
  );

  async function recite() {
    const url = sessionStorage.getItem(`${title}.wav`);
    if (url) {
      setUrl(url);
    } else {
      await textToSpeech(lines.join("\n"), title);
      setUrl(sessionStorage.getItem(`${title}.wav`) as string);
    }
  }

  return (
    <div className='poem'>
      <h1>{title}</h1>
      {showLines && (
        <div className='lines'>
          {lines.map((line, idx) => (
            <p key={idx}>{line}</p>
          ))}
        </div>
      )}
      <h2>- {author}</h2>
      <div className='buttons'>
        <button onClick={() => setShowLines(!showLines)}>
          {showLines ? "Hide" : "Show"} lines
        </button>
        <button onClick={recite}>Recite</button>
      </div>
      {url && <audio src={url} autoPlay={true} controls={true}></audio>}
    </div>
  );
}

function App() {
  const [searchUsingAuthor, setSearchUsingAuthor] = useState(true);
  const [authors, setAuthors] = useState(Array<string>);
  const [poems, setPoems] = useState([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchAuthors() {
      const res = await axios.get(POETRY_API + "/author");
      const { authors } = res.data;
      setAuthors([...authors]);
    }
    fetchAuthors();
  }, []);

  return (
    <>
      <h1>Read and listen to your favourite poems!</h1>
      <h2>Search poems by {searchUsingAuthor ? "author's name" : "title"}</h2>
      <button
        onClick={() => setSearchUsingAuthor(!searchUsingAuthor)}
        className='change-mode'
      >
        Click here to search by {searchUsingAuthor ? "title" : "author"} instead
      </button>
      {searchUsingAuthor ? (
        <AuthorForm
          authors={authors}
          setPoems={setPoems}
          setNotFound={setNotFound}
        />
      ) : (
        <TitleForm setPoems={setPoems} setNotFound={setNotFound} />
      )}

      {notFound ? (
        <>
          <div className='error'>Sorry! No poem matches the request query!</div>
        </>
      ) : (
        <>
          {poems.length > 0 && (
            <div>
              <h2>Poems:</h2>
              {poems.map((poem, idx) => {
                const {
                  title,
                  lines,
                  author,
                }: { title: string; lines: string[]; author: string } = poem;
                return (
                  <Poem title={title} lines={lines} author={author} key={idx} />
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}

export default App;
