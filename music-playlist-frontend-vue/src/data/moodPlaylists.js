/**
 * SOUNDWAVE — Library & Mood Playlists Architecture
 *
 * Sourced from the user's music library collection.
 * Pure offline data architecture with many-to-many mood playlist mappings.
 * Zero external API dependencies (no Spotify API, OAuth, or catalog services required).
 */

// 1. Centralized Master Library Collection (Single Source of Truth)
export const LIBRARY_SONGS = [
  {
    "id": "song-one-kiss",
    "_id": "song-one-kiss",
    "title": "Deep house",
    "artist": "Cooloop",
    "album": "Deep house",
    "duration": 125,
    "genre": "Electronic / Dance",
    "coverImage": "https://usercontent.jamendo.com?type=album&id=259140&width=300&trackid=1580571",
    "artwork": "https://usercontent.jamendo.com?type=album&id=259140&width=300&trackid=1580571",
    "url": "https://prod-1.storage.jamendo.com/?trackid=1580571&format=mp32&from=Rc9hin%2FoMSSnL41F%2BkHKsg%3D%3D%7C5Ra%2F7pRdjnn%2FFg8b%2BzWM6w%3D%3D",
    "audioUrl": "https://prod-1.storage.jamendo.com/?trackid=1580571&format=mp32&from=Rc9hin%2FoMSSnL41F%2BkHKsg%3D%3D%7C5Ra%2F7pRdjnn%2FFg8b%2BzWM6w%3D%3D",
    "streamUrl": "https://prod-1.storage.jamendo.com/?trackid=1580571&format=mp32&from=Rc9hin%2FoMSSnL41F%2BkHKsg%3D%3D%7C5Ra%2F7pRdjnn%2FFg8b%2BzWM6w%3D%3D",
    "localAudioSource": "https://prod-1.storage.jamendo.com/?trackid=1580571&format=mp32&from=Rc9hin%2FoMSSnL41F%2BkHKsg%3D%3D%7C5Ra%2F7pRdjnn%2FFg8b%2BzWM6w%3D%3D",
    "provider": "jamendo",
    "providerTrackId": "1580571",
    "isPlayable": true,
    "isUnavailable": false,
    "source": {
      "provider": "jamendo",
      "externalId": "1580571",
      "url": "https://prod-1.storage.jamendo.com/?trackid=1580571&format=mp32&from=Rc9hin%2FoMSSnL41F%2BkHKsg%3D%3D%7C5Ra%2F7pRdjnn%2FFg8b%2BzWM6w%3D%3D",
      "pageUrl": "https://www.jamendo.com/track/1580571"
    },
    "license": {
      "name": "CC BY-NC-ND 3.0",
      "url": "http://creativecommons.org/licenses/by-nc-nd/3.0/",
      "attribution": "Cooloop via Jamendo Music (CC BY-NC-ND 3.0)"
    }
  },
  {
    "id": "song-lily",
    "_id": "song-lily",
    "title": "Atmospheric Piano for Nature",
    "artist": "Oleg Silukov",
    "album": "Atmospheric Piano for Nature",
    "duration": 190,
    "genre": "Electronic / Dance",
    "coverImage": "https://usercontent.jamendo.com?type=album&id=552768&width=300&trackid=2139839",
    "artwork": "https://usercontent.jamendo.com?type=album&id=552768&width=300&trackid=2139839",
    "url": "https://prod-1.storage.jamendo.com/?trackid=2139839&format=mp32&from=iIAHcUuykkKyiJZoUmftVQ%3D%3D%7CGBjh6d6y8C9%2FZbxPdQXAqg%3D%3D",
    "audioUrl": "https://prod-1.storage.jamendo.com/?trackid=2139839&format=mp32&from=iIAHcUuykkKyiJZoUmftVQ%3D%3D%7CGBjh6d6y8C9%2FZbxPdQXAqg%3D%3D",
    "streamUrl": "https://prod-1.storage.jamendo.com/?trackid=2139839&format=mp32&from=iIAHcUuykkKyiJZoUmftVQ%3D%3D%7CGBjh6d6y8C9%2FZbxPdQXAqg%3D%3D",
    "localAudioSource": "https://prod-1.storage.jamendo.com/?trackid=2139839&format=mp32&from=iIAHcUuykkKyiJZoUmftVQ%3D%3D%7CGBjh6d6y8C9%2FZbxPdQXAqg%3D%3D",
    "provider": "jamendo",
    "providerTrackId": "2139839",
    "isPlayable": true,
    "isUnavailable": false,
    "source": {
      "provider": "jamendo",
      "externalId": "2139839",
      "url": "https://prod-1.storage.jamendo.com/?trackid=2139839&format=mp32&from=iIAHcUuykkKyiJZoUmftVQ%3D%3D%7CGBjh6d6y8C9%2FZbxPdQXAqg%3D%3D",
      "pageUrl": "https://www.jamendo.com/track/2139839"
    },
    "license": {
      "name": "CC BY-NC-ND 3.0",
      "url": "http://creativecommons.org/licenses/by-nc-nd/3.0/",
      "attribution": "Oleg Silukov via Jamendo Music (CC BY-NC-ND 3.0)"
    }
  },
  {
    "id": "song-not-you",
    "_id": "song-not-you",
    "title": "Inspiring Pop Ballad",
    "artist": "GubinDmitry",
    "album": "Inspiring Pop Ballad",
    "duration": 122,
    "genre": "English Pop",
    "coverImage": "https://usercontent.jamendo.com?type=album&id=369166&width=300&trackid=1827611",
    "artwork": "https://usercontent.jamendo.com?type=album&id=369166&width=300&trackid=1827611",
    "url": "https://prod-1.storage.jamendo.com/?trackid=1827611&format=mp32&from=pKIADSpmy8fbyaKfvNQnOw%3D%3D%7CCapM0W%2Fv328tMD%2BRYnMT4A%3D%3D",
    "audioUrl": "https://prod-1.storage.jamendo.com/?trackid=1827611&format=mp32&from=pKIADSpmy8fbyaKfvNQnOw%3D%3D%7CCapM0W%2Fv328tMD%2BRYnMT4A%3D%3D",
    "streamUrl": "https://prod-1.storage.jamendo.com/?trackid=1827611&format=mp32&from=pKIADSpmy8fbyaKfvNQnOw%3D%3D%7CCapM0W%2Fv328tMD%2BRYnMT4A%3D%3D",
    "localAudioSource": "https://prod-1.storage.jamendo.com/?trackid=1827611&format=mp32&from=pKIADSpmy8fbyaKfvNQnOw%3D%3D%7CCapM0W%2Fv328tMD%2BRYnMT4A%3D%3D",
    "provider": "jamendo",
    "providerTrackId": "1827611",
    "isPlayable": true,
    "isUnavailable": false,
    "source": {
      "provider": "jamendo",
      "externalId": "1827611",
      "url": "https://prod-1.storage.jamendo.com/?trackid=1827611&format=mp32&from=pKIADSpmy8fbyaKfvNQnOw%3D%3D%7CCapM0W%2Fv328tMD%2BRYnMT4A%3D%3D",
      "pageUrl": "https://www.jamendo.com/track/1827611"
    },
    "license": {
      "name": "CC BY-NC-SA 3.0",
      "url": "http://creativecommons.org/licenses/by-nc-sa/3.0/",
      "attribution": "GubinDmitry via Jamendo Music (CC BY-NC-SA 3.0)"
    }
  },
  {
    "id": "song-faded",
    "_id": "song-faded",
    "title": "Color Without the Moon",
    "artist": "Zion Music",
    "album": "Melodic EDM",
    "duration": 236,
    "genre": "Electronic / Dance",
    "coverImage": "https://usercontent.jamendo.com?type=album&id=167672&width=300&trackid=1440481",
    "artwork": "https://usercontent.jamendo.com?type=album&id=167672&width=300&trackid=1440481",
    "url": "https://prod-1.storage.jamendo.com/?trackid=1440481&format=mp32&from=k3PhRcTiIjGF2KU%2Fg4Y3ew%3D%3D%7CvGGGJkgHbBex2urDvJNhfw%3D%3D",
    "audioUrl": "https://prod-1.storage.jamendo.com/?trackid=1440481&format=mp32&from=k3PhRcTiIjGF2KU%2Fg4Y3ew%3D%3D%7CvGGGJkgHbBex2urDvJNhfw%3D%3D",
    "streamUrl": "https://prod-1.storage.jamendo.com/?trackid=1440481&format=mp32&from=k3PhRcTiIjGF2KU%2Fg4Y3ew%3D%3D%7CvGGGJkgHbBex2urDvJNhfw%3D%3D",
    "localAudioSource": "https://prod-1.storage.jamendo.com/?trackid=1440481&format=mp32&from=k3PhRcTiIjGF2KU%2Fg4Y3ew%3D%3D%7CvGGGJkgHbBex2urDvJNhfw%3D%3D",
    "provider": "jamendo",
    "providerTrackId": "1440481",
    "isPlayable": true,
    "isUnavailable": false,
    "source": {
      "provider": "jamendo",
      "externalId": "1440481",
      "url": "https://prod-1.storage.jamendo.com/?trackid=1440481&format=mp32&from=k3PhRcTiIjGF2KU%2Fg4Y3ew%3D%3D%7CvGGGJkgHbBex2urDvJNhfw%3D%3D",
      "pageUrl": "https://www.jamendo.com/track/1440481"
    },
    "license": {
      "name": "CC BY-NC 3.0",
      "url": "http://creativecommons.org/licenses/by-nc/3.0/",
      "attribution": "Zion Music via Jamendo Music (CC BY-NC 3.0)"
    }
  },
  {
    "id": "song-on-my-way",
    "_id": "song-on-my-way",
    "title": "Gone the way of flesh",
    "artist": "The Kiss That Took A Trip",
    "album": "Hi, America! (home demo)",
    "duration": 272,
    "genre": "English Pop",
    "coverImage": "https://usercontent.jamendo.com?type=album&id=41610&width=300&trackid=306306",
    "artwork": "https://usercontent.jamendo.com?type=album&id=41610&width=300&trackid=306306",
    "url": "https://prod-1.storage.jamendo.com/?trackid=306306&format=mp32&from=b2jc0ud3vB9pwZtrbX%2FUsw%3D%3D%7CmGhj0UgPqE0ihOHLdMbA2Q%3D%3D",
    "audioUrl": "https://prod-1.storage.jamendo.com/?trackid=306306&format=mp32&from=b2jc0ud3vB9pwZtrbX%2FUsw%3D%3D%7CmGhj0UgPqE0ihOHLdMbA2Q%3D%3D",
    "streamUrl": "https://prod-1.storage.jamendo.com/?trackid=306306&format=mp32&from=b2jc0ud3vB9pwZtrbX%2FUsw%3D%3D%7CmGhj0UgPqE0ihOHLdMbA2Q%3D%3D",
    "localAudioSource": "https://prod-1.storage.jamendo.com/?trackid=306306&format=mp32&from=b2jc0ud3vB9pwZtrbX%2FUsw%3D%3D%7CmGhj0UgPqE0ihOHLdMbA2Q%3D%3D",
    "provider": "jamendo",
    "providerTrackId": "306306",
    "isPlayable": true,
    "isUnavailable": false,
    "source": {
      "provider": "jamendo",
      "externalId": "306306",
      "url": "https://prod-1.storage.jamendo.com/?trackid=306306&format=mp32&from=b2jc0ud3vB9pwZtrbX%2FUsw%3D%3D%7CmGhj0UgPqE0ihOHLdMbA2Q%3D%3D",
      "pageUrl": "https://www.jamendo.com/track/306306"
    },
    "license": {
      "name": "CC BY-NC-SA 3.0",
      "url": "http://creativecommons.org/licenses/by-nc-sa/3.0/",
      "attribution": "The Kiss That Took A Trip via Jamendo Music (CC BY-NC-SA 3.0)"
    }
  },
  {
    "id": "song-alone",
    "_id": "song-alone",
    "title": "Off The Top [melodic dance/house]128bpm",
    "artist": "1000Handz",
    "album": "Off The Top [melodic dance/house]128bpm",
    "duration": 101,
    "genre": "Electronic / Dance",
    "coverImage": "https://usercontent.jamendo.com?type=album&id=618670&width=300&trackid=2287340",
    "artwork": "https://usercontent.jamendo.com?type=album&id=618670&width=300&trackid=2287340",
    "url": "https://prod-1.storage.jamendo.com/?trackid=2287340&format=mp32&from=1VP16cPX4CcrKlirC8%2B3Bg%3D%3D%7C3Q1zCjp2vgdVZUXyedib1g%3D%3D",
    "audioUrl": "https://prod-1.storage.jamendo.com/?trackid=2287340&format=mp32&from=1VP16cPX4CcrKlirC8%2B3Bg%3D%3D%7C3Q1zCjp2vgdVZUXyedib1g%3D%3D",
    "streamUrl": "https://prod-1.storage.jamendo.com/?trackid=2287340&format=mp32&from=1VP16cPX4CcrKlirC8%2B3Bg%3D%3D%7C3Q1zCjp2vgdVZUXyedib1g%3D%3D",
    "localAudioSource": "https://prod-1.storage.jamendo.com/?trackid=2287340&format=mp32&from=1VP16cPX4CcrKlirC8%2B3Bg%3D%3D%7C3Q1zCjp2vgdVZUXyedib1g%3D%3D",
    "provider": "jamendo",
    "providerTrackId": "2287340",
    "isPlayable": true,
    "isUnavailable": false,
    "source": {
      "provider": "jamendo",
      "externalId": "2287340",
      "url": "https://prod-1.storage.jamendo.com/?trackid=2287340&format=mp32&from=1VP16cPX4CcrKlirC8%2B3Bg%3D%3D%7C3Q1zCjp2vgdVZUXyedib1g%3D%3D",
      "pageUrl": "https://www.jamendo.com/track/2287340"
    },
    "license": {
      "name": "CC BY 3.0",
      "url": "http://creativecommons.org/licenses/by/3.0/",
      "attribution": "1000Handz via Jamendo Music (CC BY 3.0)"
    }
  },
  {
    "id": "song-see-you-again",
    "_id": "song-see-you-again",
    "title": "Kyoto [ambient melodic rap instrumental]",
    "artist": "1000Handz",
    "album": "Kyoto [ambient melodic rap instrumental]",
    "duration": 157,
    "genre": "Hip-Hop",
    "coverImage": "https://usercontent.jamendo.com?type=album&id=618673&width=300&trackid=2287343",
    "artwork": "https://usercontent.jamendo.com?type=album&id=618673&width=300&trackid=2287343",
    "url": "https://prod-1.storage.jamendo.com/?trackid=2287343&format=mp32&from=kPW67Ew6kNs2IcEdQ3mjaQ%3D%3D%7CfITCshjS8bWwlMPty96eog%3D%3D",
    "audioUrl": "https://prod-1.storage.jamendo.com/?trackid=2287343&format=mp32&from=kPW67Ew6kNs2IcEdQ3mjaQ%3D%3D%7CfITCshjS8bWwlMPty96eog%3D%3D",
    "streamUrl": "https://prod-1.storage.jamendo.com/?trackid=2287343&format=mp32&from=kPW67Ew6kNs2IcEdQ3mjaQ%3D%3D%7CfITCshjS8bWwlMPty96eog%3D%3D",
    "localAudioSource": "https://prod-1.storage.jamendo.com/?trackid=2287343&format=mp32&from=kPW67Ew6kNs2IcEdQ3mjaQ%3D%3D%7CfITCshjS8bWwlMPty96eog%3D%3D",
    "provider": "jamendo",
    "providerTrackId": "2287343",
    "isPlayable": true,
    "isUnavailable": false,
    "source": {
      "provider": "jamendo",
      "externalId": "2287343",
      "url": "https://prod-1.storage.jamendo.com/?trackid=2287343&format=mp32&from=kPW67Ew6kNs2IcEdQ3mjaQ%3D%3D%7CfITCshjS8bWwlMPty96eog%3D%3D",
      "pageUrl": "https://www.jamendo.com/track/2287343"
    },
    "license": {
      "name": "CC BY 3.0",
      "url": "http://creativecommons.org/licenses/by/3.0/",
      "attribution": "1000Handz via Jamendo Music (CC BY 3.0)"
    }
  },
  {
    "id": "song-dandelions",
    "_id": "song-dandelions",
    "title": "Romantic acoustic piano",
    "artist": "DepasRec",
    "album": "Romantic acoustic piano",
    "duration": 132,
    "genre": "English Pop",
    "coverImage": "https://usercontent.jamendo.com?type=album&id=393477&width=300&trackid=1553433",
    "artwork": "https://usercontent.jamendo.com?type=album&id=393477&width=300&trackid=1553433",
    "url": "https://prod-1.storage.jamendo.com/?trackid=1553433&format=mp32&from=%2FrlPtecs9jIA%2FbvDGbh%2FEQ%3D%3D%7CyiogZzTiJ8SG4H6%2Fip3F4w%3D%3D",
    "audioUrl": "https://prod-1.storage.jamendo.com/?trackid=1553433&format=mp32&from=%2FrlPtecs9jIA%2FbvDGbh%2FEQ%3D%3D%7CyiogZzTiJ8SG4H6%2Fip3F4w%3D%3D",
    "streamUrl": "https://prod-1.storage.jamendo.com/?trackid=1553433&format=mp32&from=%2FrlPtecs9jIA%2FbvDGbh%2FEQ%3D%3D%7CyiogZzTiJ8SG4H6%2Fip3F4w%3D%3D",
    "localAudioSource": "https://prod-1.storage.jamendo.com/?trackid=1553433&format=mp32&from=%2FrlPtecs9jIA%2FbvDGbh%2FEQ%3D%3D%7CyiogZzTiJ8SG4H6%2Fip3F4w%3D%3D",
    "provider": "jamendo",
    "providerTrackId": "1553433",
    "isPlayable": true,
    "isUnavailable": false,
    "source": {
      "provider": "jamendo",
      "externalId": "1553433",
      "url": "https://prod-1.storage.jamendo.com/?trackid=1553433&format=mp32&from=%2FrlPtecs9jIA%2FbvDGbh%2FEQ%3D%3D%7CyiogZzTiJ8SG4H6%2Fip3F4w%3D%3D",
      "pageUrl": "https://www.jamendo.com/track/1553433"
    },
    "license": {
      "name": "CC BY-NC-ND 3.0",
      "url": "http://creativecommons.org/licenses/by-nc-nd/3.0/",
      "attribution": "DepasRec via Jamendo Music (CC BY-NC-ND 3.0)"
    }
  },
  {
    "id": "song-senorita",
    "_id": "song-senorita",
    "title": "Catalan Rumba",
    "artist": "Fatima Mhedden",
    "album": "Catalan Rumba",
    "duration": 180,
    "genre": "Latin",
    "coverImage": "https://usercontent.jamendo.com?type=album&id=479906&width=300&trackid=1938961",
    "artwork": "https://usercontent.jamendo.com?type=album&id=479906&width=300&trackid=1938961",
    "url": "https://prod-1.storage.jamendo.com/?trackid=1938961&format=mp32&from=Du8P80hL94o1%2B3WItDovcg%3D%3D%7Co03VjZTdJEu5hzPlbx%2BIEw%3D%3D",
    "audioUrl": "https://prod-1.storage.jamendo.com/?trackid=1938961&format=mp32&from=Du8P80hL94o1%2B3WItDovcg%3D%3D%7Co03VjZTdJEu5hzPlbx%2BIEw%3D%3D",
    "streamUrl": "https://prod-1.storage.jamendo.com/?trackid=1938961&format=mp32&from=Du8P80hL94o1%2B3WItDovcg%3D%3D%7Co03VjZTdJEu5hzPlbx%2BIEw%3D%3D",
    "localAudioSource": "https://prod-1.storage.jamendo.com/?trackid=1938961&format=mp32&from=Du8P80hL94o1%2B3WItDovcg%3D%3D%7Co03VjZTdJEu5hzPlbx%2BIEw%3D%3D",
    "provider": "jamendo",
    "providerTrackId": "1938961",
    "isPlayable": true,
    "isUnavailable": false,
    "source": {
      "provider": "jamendo",
      "externalId": "1938961",
      "url": "https://prod-1.storage.jamendo.com/?trackid=1938961&format=mp32&from=Du8P80hL94o1%2B3WItDovcg%3D%3D%7Co03VjZTdJEu5hzPlbx%2BIEw%3D%3D",
      "pageUrl": "https://www.jamendo.com/track/1938961"
    },
    "license": {
      "name": "CC BY-NC-ND 3.0",
      "url": "http://creativecommons.org/licenses/by-nc-nd/3.0/",
      "attribution": "Fatima Mhedden via Jamendo Music (CC BY-NC-ND 3.0)"
    }
  },
  {
    "id": "song-shape-of-you",
    "_id": "song-shape-of-you",
    "title": "Tropical Pop",
    "artist": "Alexey Anisimov",
    "album": "Tropical Pop",
    "duration": 132,
    "genre": "English Pop",
    "coverImage": "https://usercontent.jamendo.com?type=album&id=409398&width=300&trackid=1549318",
    "artwork": "https://usercontent.jamendo.com?type=album&id=409398&width=300&trackid=1549318",
    "url": "https://prod-1.storage.jamendo.com/?trackid=1549318&format=mp32&from=K2CpMcCVBA7ugQGYtt1m%2Bg%3D%3D%7CBvwbm26YHlApUMVogg14Pw%3D%3D",
    "audioUrl": "https://prod-1.storage.jamendo.com/?trackid=1549318&format=mp32&from=K2CpMcCVBA7ugQGYtt1m%2Bg%3D%3D%7CBvwbm26YHlApUMVogg14Pw%3D%3D",
    "streamUrl": "https://prod-1.storage.jamendo.com/?trackid=1549318&format=mp32&from=K2CpMcCVBA7ugQGYtt1m%2Bg%3D%3D%7CBvwbm26YHlApUMVogg14Pw%3D%3D",
    "localAudioSource": "https://prod-1.storage.jamendo.com/?trackid=1549318&format=mp32&from=K2CpMcCVBA7ugQGYtt1m%2Bg%3D%3D%7CBvwbm26YHlApUMVogg14Pw%3D%3D",
    "provider": "jamendo",
    "providerTrackId": "1549318",
    "isPlayable": true,
    "isUnavailable": false,
    "source": {
      "provider": "jamendo",
      "externalId": "1549318",
      "url": "https://prod-1.storage.jamendo.com/?trackid=1549318&format=mp32&from=K2CpMcCVBA7ugQGYtt1m%2Bg%3D%3D%7CBvwbm26YHlApUMVogg14Pw%3D%3D",
      "pageUrl": "https://www.jamendo.com/track/1549318"
    },
    "license": {
      "name": "CC BY-NC-ND 3.0",
      "url": "http://creativecommons.org/licenses/by-nc-nd/3.0/",
      "attribution": "Alexey Anisimov via Jamendo Music (CC BY-NC-ND 3.0)"
    }
  },
  {
    "id": "song-lovely",
    "_id": "song-lovely",
    "title": "Melancholic Piano in Nature",
    "artist": "Marc Corominas Pujadó",
    "album": "Melancholic Piano in Nature",
    "duration": 129,
    "genre": "Alternative / Indie",
    "coverImage": "https://usercontent.jamendo.com?type=album&id=429548&width=300&trackid=1793652",
    "artwork": "https://usercontent.jamendo.com?type=album&id=429548&width=300&trackid=1793652",
    "url": "https://prod-1.storage.jamendo.com/?trackid=1793652&format=mp32&from=pGNozM%2BW%2FC1hUtSjOERCBA%3D%3D%7Cx0HAUYX1U2HjAfLk9lfl7A%3D%3D",
    "audioUrl": "https://prod-1.storage.jamendo.com/?trackid=1793652&format=mp32&from=pGNozM%2BW%2FC1hUtSjOERCBA%3D%3D%7Cx0HAUYX1U2HjAfLk9lfl7A%3D%3D",
    "streamUrl": "https://prod-1.storage.jamendo.com/?trackid=1793652&format=mp32&from=pGNozM%2BW%2FC1hUtSjOERCBA%3D%3D%7Cx0HAUYX1U2HjAfLk9lfl7A%3D%3D",
    "localAudioSource": "https://prod-1.storage.jamendo.com/?trackid=1793652&format=mp32&from=pGNozM%2BW%2FC1hUtSjOERCBA%3D%3D%7Cx0HAUYX1U2HjAfLk9lfl7A%3D%3D",
    "provider": "jamendo",
    "providerTrackId": "1793652",
    "isPlayable": true,
    "isUnavailable": false,
    "source": {
      "provider": "jamendo",
      "externalId": "1793652",
      "url": "https://prod-1.storage.jamendo.com/?trackid=1793652&format=mp32&from=pGNozM%2BW%2FC1hUtSjOERCBA%3D%3D%7Cx0HAUYX1U2HjAfLk9lfl7A%3D%3D",
      "pageUrl": "https://www.jamendo.com/track/1793652"
    },
    "license": {
      "name": "CC BY-NC-ND 3.0",
      "url": "http://creativecommons.org/licenses/by-nc-nd/3.0/",
      "attribution": "Marc Corominas Pujadó via Jamendo Music (CC BY-NC-ND 3.0)"
    }
  },
  {
    "id": "song-im-alive",
    "_id": "song-im-alive",
    "title": "Club Dance EDM",
    "artist": "Energysound",
    "album": "EDM Dance (Background Club Music)",
    "duration": 133,
    "genre": "Electronic / Dance",
    "coverImage": "https://usercontent.jamendo.com?type=album&id=457323&width=300&trackid=1890062",
    "artwork": "https://usercontent.jamendo.com?type=album&id=457323&width=300&trackid=1890062",
    "url": "https://prod-1.storage.jamendo.com/?trackid=1890062&format=mp32&from=5ISIPJXQkKahUvpJBbi0xQ%3D%3D%7CUe3cM6L%2Fb5kx1ztvJcx98w%3D%3D",
    "audioUrl": "https://prod-1.storage.jamendo.com/?trackid=1890062&format=mp32&from=5ISIPJXQkKahUvpJBbi0xQ%3D%3D%7CUe3cM6L%2Fb5kx1ztvJcx98w%3D%3D",
    "streamUrl": "https://prod-1.storage.jamendo.com/?trackid=1890062&format=mp32&from=5ISIPJXQkKahUvpJBbi0xQ%3D%3D%7CUe3cM6L%2Fb5kx1ztvJcx98w%3D%3D",
    "localAudioSource": "https://prod-1.storage.jamendo.com/?trackid=1890062&format=mp32&from=5ISIPJXQkKahUvpJBbi0xQ%3D%3D%7CUe3cM6L%2Fb5kx1ztvJcx98w%3D%3D",
    "provider": "jamendo",
    "providerTrackId": "1890062",
    "isPlayable": true,
    "isUnavailable": false,
    "source": {
      "provider": "jamendo",
      "externalId": "1890062",
      "url": "https://prod-1.storage.jamendo.com/?trackid=1890062&format=mp32&from=5ISIPJXQkKahUvpJBbi0xQ%3D%3D%7CUe3cM6L%2Fb5kx1ztvJcx98w%3D%3D",
      "pageUrl": "https://www.jamendo.com/track/1890062"
    },
    "license": {
      "name": "CC BY-NC-ND 3.0",
      "url": "http://creativecommons.org/licenses/by-nc-nd/3.0/",
      "attribution": "Energysound via Jamendo Music (CC BY-NC-ND 3.0)"
    }
  },
  {
    "id": "song-night-we-met",
    "_id": "song-night-we-met",
    "title": "Indie Folk",
    "artist": "Z-studio",
    "album": "Indie Folk",
    "duration": 148,
    "genre": "Alternative / Indie",
    "coverImage": "https://usercontent.jamendo.com?type=album&id=217085&width=300&trackid=1388533",
    "artwork": "https://usercontent.jamendo.com?type=album&id=217085&width=300&trackid=1388533",
    "url": "https://prod-1.storage.jamendo.com/?trackid=1388533&format=mp32&from=ZtrxYXrjprt9I5j5R%2FjU3w%3D%3D%7CXuRBK1%2FcmVmOEtpULXpOng%3D%3D",
    "audioUrl": "https://prod-1.storage.jamendo.com/?trackid=1388533&format=mp32&from=ZtrxYXrjprt9I5j5R%2FjU3w%3D%3D%7CXuRBK1%2FcmVmOEtpULXpOng%3D%3D",
    "streamUrl": "https://prod-1.storage.jamendo.com/?trackid=1388533&format=mp32&from=ZtrxYXrjprt9I5j5R%2FjU3w%3D%3D%7CXuRBK1%2FcmVmOEtpULXpOng%3D%3D",
    "localAudioSource": "https://prod-1.storage.jamendo.com/?trackid=1388533&format=mp32&from=ZtrxYXrjprt9I5j5R%2FjU3w%3D%3D%7CXuRBK1%2FcmVmOEtpULXpOng%3D%3D",
    "provider": "jamendo",
    "providerTrackId": "1388533",
    "isPlayable": true,
    "isUnavailable": false,
    "source": {
      "provider": "jamendo",
      "externalId": "1388533",
      "url": "https://prod-1.storage.jamendo.com/?trackid=1388533&format=mp32&from=ZtrxYXrjprt9I5j5R%2FjU3w%3D%3D%7CXuRBK1%2FcmVmOEtpULXpOng%3D%3D",
      "pageUrl": "https://www.jamendo.com/track/1388533"
    },
    "license": {
      "name": "CC BY-NC-ND 3.0",
      "url": "http://creativecommons.org/licenses/by-nc-nd/3.0/",
      "attribution": "Z-studio via Jamendo Music (CC BY-NC-ND 3.0)"
    }
  },
  {
    "id": "song-malibu",
    "_id": "song-malibu",
    "title": "Summer Pop",
    "artist": "GarnaVutka",
    "album": "Summer Pop",
    "duration": 138,
    "genre": "English Pop",
    "coverImage": "https://usercontent.jamendo.com?type=album&id=234503&width=300&trackid=1352969",
    "artwork": "https://usercontent.jamendo.com?type=album&id=234503&width=300&trackid=1352969",
    "url": "https://prod-1.storage.jamendo.com/?trackid=1352969&format=mp32&from=nFD7rRBq6UTg1UQNilD4mw%3D%3D%7CaM0t0gPNJ6v6HbCVfpcPrw%3D%3D",
    "audioUrl": "https://prod-1.storage.jamendo.com/?trackid=1352969&format=mp32&from=nFD7rRBq6UTg1UQNilD4mw%3D%3D%7CaM0t0gPNJ6v6HbCVfpcPrw%3D%3D",
    "streamUrl": "https://prod-1.storage.jamendo.com/?trackid=1352969&format=mp32&from=nFD7rRBq6UTg1UQNilD4mw%3D%3D%7CaM0t0gPNJ6v6HbCVfpcPrw%3D%3D",
    "localAudioSource": "https://prod-1.storage.jamendo.com/?trackid=1352969&format=mp32&from=nFD7rRBq6UTg1UQNilD4mw%3D%3D%7CaM0t0gPNJ6v6HbCVfpcPrw%3D%3D",
    "provider": "jamendo",
    "providerTrackId": "1352969",
    "isPlayable": true,
    "isUnavailable": false,
    "source": {
      "provider": "jamendo",
      "externalId": "1352969",
      "url": "https://prod-1.storage.jamendo.com/?trackid=1352969&format=mp32&from=nFD7rRBq6UTg1UQNilD4mw%3D%3D%7CaM0t0gPNJ6v6HbCVfpcPrw%3D%3D",
      "pageUrl": "https://www.jamendo.com/track/1352969"
    },
    "license": {
      "name": "CC BY-NC-ND 3.0",
      "url": "http://creativecommons.org/licenses/by-nc-nd/3.0/",
      "attribution": "GarnaVutka via Jamendo Music (CC BY-NC-ND 3.0)"
    }
  },
  {
    "id": "song-ginza",
    "_id": "song-ginza",
    "title": "Reggaeton Latino",
    "artist": "pinegroove",
    "album": "Reggaeton Latino",
    "duration": 185,
    "genre": "Reggaeton",
    "coverImage": "https://usercontent.jamendo.com?type=album&id=198932&width=300&trackid=1825924",
    "artwork": "https://usercontent.jamendo.com?type=album&id=198932&width=300&trackid=1825924",
    "url": "https://prod-1.storage.jamendo.com/?trackid=1825924&format=mp32&from=%2Bj9ar%2FQkqIGZ5uD9gEqqrg%3D%3D%7C2sUopUW0GuIpDRV96PuCsA%3D%3D",
    "audioUrl": "https://prod-1.storage.jamendo.com/?trackid=1825924&format=mp32&from=%2Bj9ar%2FQkqIGZ5uD9gEqqrg%3D%3D%7C2sUopUW0GuIpDRV96PuCsA%3D%3D",
    "streamUrl": "https://prod-1.storage.jamendo.com/?trackid=1825924&format=mp32&from=%2Bj9ar%2FQkqIGZ5uD9gEqqrg%3D%3D%7C2sUopUW0GuIpDRV96PuCsA%3D%3D",
    "localAudioSource": "https://prod-1.storage.jamendo.com/?trackid=1825924&format=mp32&from=%2Bj9ar%2FQkqIGZ5uD9gEqqrg%3D%3D%7C2sUopUW0GuIpDRV96PuCsA%3D%3D",
    "provider": "jamendo",
    "providerTrackId": "1825924",
    "isPlayable": true,
    "isUnavailable": false,
    "source": {
      "provider": "jamendo",
      "externalId": "1825924",
      "url": "https://prod-1.storage.jamendo.com/?trackid=1825924&format=mp32&from=%2Bj9ar%2FQkqIGZ5uD9gEqqrg%3D%3D%7C2sUopUW0GuIpDRV96PuCsA%3D%3D",
      "pageUrl": "https://www.jamendo.com/track/1825924"
    },
    "license": {
      "name": "CC BY-NC-ND 3.0",
      "url": "http://creativecommons.org/licenses/by-nc-nd/3.0/",
      "attribution": "pinegroove via Jamendo Music (CC BY-NC-ND 3.0)"
    }
  },
  {
    "id": "song-gata-only",
    "_id": "song-gata-only",
    "title": "Amor inolvidable",
    "artist": "Mr.Brito Jbeatmix LaTrapMusic",
    "album": "Amor inolvidable",
    "duration": 155,
    "genre": "Reggaeton",
    "coverImage": "https://usercontent.jamendo.com?type=album&id=240987&width=300&trackid=1688097",
    "artwork": "https://usercontent.jamendo.com?type=album&id=240987&width=300&trackid=1688097",
    "url": "https://prod-1.storage.jamendo.com/?trackid=1688097&format=mp32&from=AH7B7MYckFVHlytBcQgbDA%3D%3D%7CqYeaBJiu8wt96cnLILGSng%3D%3D",
    "audioUrl": "https://prod-1.storage.jamendo.com/?trackid=1688097&format=mp32&from=AH7B7MYckFVHlytBcQgbDA%3D%3D%7CqYeaBJiu8wt96cnLILGSng%3D%3D",
    "streamUrl": "https://prod-1.storage.jamendo.com/?trackid=1688097&format=mp32&from=AH7B7MYckFVHlytBcQgbDA%3D%3D%7CqYeaBJiu8wt96cnLILGSng%3D%3D",
    "localAudioSource": "https://prod-1.storage.jamendo.com/?trackid=1688097&format=mp32&from=AH7B7MYckFVHlytBcQgbDA%3D%3D%7CqYeaBJiu8wt96cnLILGSng%3D%3D",
    "provider": "jamendo",
    "providerTrackId": "1688097",
    "isPlayable": true,
    "isUnavailable": false,
    "source": {
      "provider": "jamendo",
      "externalId": "1688097",
      "url": "https://prod-1.storage.jamendo.com/?trackid=1688097&format=mp32&from=AH7B7MYckFVHlytBcQgbDA%3D%3D%7CqYeaBJiu8wt96cnLILGSng%3D%3D",
      "pageUrl": "https://www.jamendo.com/track/1688097"
    },
    "license": {
      "name": "CC BY-NC-ND 3.0",
      "url": "http://creativecommons.org/licenses/by-nc-nd/3.0/",
      "attribution": "Mr.Brito Jbeatmix LaTrapMusic via Jamendo Music (CC BY-NC-ND 3.0)"
    }
  },
  {
    "id": "song-mi-gata",
    "_id": "song-mi-gata",
    "title": "Block Party (Brazilian Reggaeton)",
    "artist": "Jack Jack",
    "album": "Block Party (Brazilian Reggaeton)",
    "duration": 106,
    "genre": "Latin",
    "coverImage": "https://usercontent.jamendo.com?type=album&id=640508&width=300&trackid=2330830",
    "artwork": "https://usercontent.jamendo.com?type=album&id=640508&width=300&trackid=2330830",
    "url": "https://prod-1.storage.jamendo.com/?trackid=2330830&format=mp32&from=iPt%2BtnYCjSwmAfhRU4%2BtXA%3D%3D%7Ct1%2B4sbBCFa1D%2FYyPpCUEjA%3D%3D",
    "audioUrl": "https://prod-1.storage.jamendo.com/?trackid=2330830&format=mp32&from=iPt%2BtnYCjSwmAfhRU4%2BtXA%3D%3D%7Ct1%2B4sbBCFa1D%2FYyPpCUEjA%3D%3D",
    "streamUrl": "https://prod-1.storage.jamendo.com/?trackid=2330830&format=mp32&from=iPt%2BtnYCjSwmAfhRU4%2BtXA%3D%3D%7Ct1%2B4sbBCFa1D%2FYyPpCUEjA%3D%3D",
    "localAudioSource": "https://prod-1.storage.jamendo.com/?trackid=2330830&format=mp32&from=iPt%2BtnYCjSwmAfhRU4%2BtXA%3D%3D%7Ct1%2B4sbBCFa1D%2FYyPpCUEjA%3D%3D",
    "provider": "jamendo",
    "providerTrackId": "2330830",
    "isPlayable": true,
    "isUnavailable": false,
    "source": {
      "provider": "jamendo",
      "externalId": "2330830",
      "url": "https://prod-1.storage.jamendo.com/?trackid=2330830&format=mp32&from=iPt%2BtnYCjSwmAfhRU4%2BtXA%3D%3D%7Ct1%2B4sbBCFa1D%2FYyPpCUEjA%3D%3D",
      "pageUrl": "https://www.jamendo.com/track/2330830"
    },
    "license": {
      "name": "CC BY-NC-ND 3.0",
      "url": "http://creativecommons.org/licenses/by-nc-nd/3.0/",
      "attribution": "Jack Jack via Jamendo Music (CC BY-NC-ND 3.0)"
    }
  },
  {
    "id": "song-peligrosa",
    "_id": "song-peligrosa",
    "title": "AY AY AY MALUCA - Pueto pa lo mio records Presenta - Neycom - (Musica urbana, trap, rap, hiphop, dembow, reggaeton)",
    "artist": "PUETO PA LO MIO RECORDS",
    "album": "AY AY AY MALUCA - Pueto pa lo mio records Presenta - Neycom - (M",
    "duration": 163,
    "genre": "Reggaeton",
    "coverImage": "https://usercontent.jamendo.com?type=album&id=415969&width=300&trackid=1843061",
    "artwork": "https://usercontent.jamendo.com?type=album&id=415969&width=300&trackid=1843061",
    "url": "https://prod-1.storage.jamendo.com/?trackid=1843061&format=mp32&from=zVqY5jptUMm5XndQ7tGnsg%3D%3D%7Ce%2BJLPPD%2FJ%2FYO2e1QAjzqIw%3D%3D",
    "audioUrl": "https://prod-1.storage.jamendo.com/?trackid=1843061&format=mp32&from=zVqY5jptUMm5XndQ7tGnsg%3D%3D%7Ce%2BJLPPD%2FJ%2FYO2e1QAjzqIw%3D%3D",
    "streamUrl": "https://prod-1.storage.jamendo.com/?trackid=1843061&format=mp32&from=zVqY5jptUMm5XndQ7tGnsg%3D%3D%7Ce%2BJLPPD%2FJ%2FYO2e1QAjzqIw%3D%3D",
    "localAudioSource": "https://prod-1.storage.jamendo.com/?trackid=1843061&format=mp32&from=zVqY5jptUMm5XndQ7tGnsg%3D%3D%7Ce%2BJLPPD%2FJ%2FYO2e1QAjzqIw%3D%3D",
    "provider": "jamendo",
    "providerTrackId": "1843061",
    "isPlayable": true,
    "isUnavailable": false,
    "source": {
      "provider": "jamendo",
      "externalId": "1843061",
      "url": "https://prod-1.storage.jamendo.com/?trackid=1843061&format=mp32&from=zVqY5jptUMm5XndQ7tGnsg%3D%3D%7Ce%2BJLPPD%2FJ%2FYO2e1QAjzqIw%3D%3D",
      "pageUrl": "https://www.jamendo.com/track/1843061"
    },
    "license": {
      "name": "CC BY-NC-ND 3.0",
      "url": "http://creativecommons.org/licenses/by-nc-nd/3.0/",
      "attribution": "PUETO PA LO MIO RECORDS via Jamendo Music (CC BY-NC-ND 3.0)"
    }
  }
];

// Fast indexed lookup for library songs
export const getSongById = (id) => {
  return LIBRARY_SONGS.find((s) => s.id === id || s._id === id) || null;
};

// 2. Curated Mood Playlist Definitions (Many-to-many relationship using songIds)
export const MOOD_PLAYLIST_DEFINITIONS = [
  {
    id: 'mood-acoustic-mornings',
    _id: '67c000000000000000000001',
    isMood: true,
    name: 'Acoustic mornings',
    n: 'Acoustic mornings',
    emoji: '☀️',
    e: '☀️',
    o1: '#ffd27a',
    o2: '#ffa24c',
    tint: '#ffe9c9',
    description: 'Soft strings for slow starts.',
    line: 'Soft strings for slow starts.',
    songIds: [
      'song-dandelions',
      'song-night-we-met',
      'song-lovely',
      'song-not-you',
    ],
  },
  {
    id: 'mood-late-night-drive',
    _id: '67c000000000000000000002',
    isMood: true,
    name: 'Late night drive',
    n: 'Late night drive',
    emoji: '🌙',
    e: '🌙',
    o1: '#c9b6ff',
    o2: '#8a68ff',
    tint: '#e6dcff',
    description: 'Dreamy piano for empty roads.',
    line: 'Dreamy piano for empty roads.',
    songIds: [
      'song-faded',
      'song-lily',
      'song-alone',
      'song-not-you',
      'song-night-we-met',
    ],
  },
  {
    id: 'mood-study-loop',
    _id: '67c000000000000000000003',
    isMood: true,
    name: 'Study loop',
    n: 'Study loop',
    emoji: '🌿',
    e: '🌿',
    o1: '#79ecd1',
    o2: '#20c997',
    tint: '#d3f8ec',
    description: 'Calm synth sweeps on repeat.',
    line: 'Calm synth sweeps on repeat.',
    songIds: [
      'song-lovely',
      'song-night-we-met',
      'song-dandelions',
      'song-not-you',
    ],
  },
  {
    id: 'mood-gym-pump',
    _id: '67c000000000000000000004',
    isMood: true,
    name: 'Gym pump',
    n: 'Gym pump',
    emoji: '🔥',
    e: '🔥',
    o1: '#ff9bd2',
    o2: '#ff4f9a',
    tint: '#ffd9ec',
    description: 'Big drums, bigger energy.',
    line: 'Big drums, bigger energy.',
    songIds: [
      'song-one-kiss',
      'song-shape-of-you',
      'song-senorita',
      'song-im-alive',
      'song-alone',
    ],
  },
  {
    id: 'mood-road-trip',
    _id: '67c000000000000000000005',
    isMood: true,
    name: 'Road trip',
    n: 'Road trip',
    emoji: '🚗',
    e: '🚗',
    o1: '#9ad8ff',
    o2: '#3fa7ff',
    tint: '#d4eeff',
    description: 'Bright tunes for open windows.',
    line: 'Bright tunes for open windows.',
    songIds: [
      'song-on-my-way',
      'song-see-you-again',
      'song-malibu',
      'song-one-kiss',
      'song-shape-of-you',
    ],
  },
];

// 3. Hydrated Mood Playlists (References resolved from LIBRARY_SONGS without record duplication)
export const MOOD_PLAYLISTS = MOOD_PLAYLIST_DEFINITIONS.map((def) => {
  const resolvedSongs = def.songIds
    .map((id) => getSongById(id))
    .filter(Boolean);

  const totalDuration = resolvedSongs.reduce((sum, s) => sum + (s.duration || 0), 0);

  return {
    ...def,
    songs: resolvedSongs,
    t: resolvedSongs, // backward-compatible alias
    totalDuration,
    trackCount: resolvedSongs.length,
  };
});

// Helper to format track duration (mm:ss)
export const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

// Particle pop utility matching HTML reference
export const popParticles = (x, y, n = 16, colors = { o1: '#ff9bd2', o2: '#ff6fb5' }) => {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  for (let i = 0; i < n; i++) {
    const d = document.createElement('i');
    d.className = 'bub';
    const s = 14 + Math.random() * 34;
    d.style.cssText = `left:${x}px;top:${y}px;width:${s}px;height:${s}px;--bc:${i % 2 ? colors.o1 : colors.o2}`;
    document.body.appendChild(d);

    const a = Math.random() * 6.28;
    const v = 60 + Math.random() * 180;
    d.animate(
      [
        { transform: 'translate(0,0) scale(.3)', opacity: 1 },
        { transform: `translate(${Math.cos(a) * v}px,${Math.sin(a) * v - 170}px) scale(1)`, opacity: 1, offset: 0.75 },
        { transform: `translate(${Math.cos(a) * v * 1.05}px,${Math.sin(a) * v - 190}px) scale(1.4)`, opacity: 0 },
      ],
      {
        duration: 1100 + Math.random() * 700,
        easing: 'cubic-bezier(.2,.8,.3,1)',
      }
    ).onfinish = () => d.remove();
  }
};
