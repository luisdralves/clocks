export interface SunTimes {
  sunrise: number;
  sunset: number;
  isDayAllDay?: boolean;
  isNightAllDay?: boolean;
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getSolarDeclination(dayOfYear: number): number {
  return ((23.45 * Math.PI) / 180) * Math.sin(((2 * Math.PI) / 365) * (dayOfYear - 81));
}

export function getSunTimes(date: Date, lat: number, lon: number): SunTimes {
  const dayOfYear = getDayOfYear(date);
  const declination = getSolarDeclination(dayOfYear);
  const latRad = (lat * Math.PI) / 180;

  const cosHourAngle = -Math.tan(latRad) * Math.tan(declination);

  if (cosHourAngle < -1) {
    return { sunrise: 0, sunset: 24, isDayAllDay: true };
  }
  if (cosHourAngle > 1) {
    return { sunrise: 12, sunset: 12, isNightAllDay: true };
  }

  const hourAngle = Math.acos(cosHourAngle);
  const hourAngleHours = (hourAngle * 12) / Math.PI;

  const timezoneOffsetHours = -date.getTimezoneOffset() / 60;
  const solarNoon = 12 - lon / 15 + timezoneOffsetHours;

  const sunrise = solarNoon - hourAngleHours;
  const sunset = solarNoon + hourAngleHours;

  return { sunrise, sunset };
}

export function getTemporalTime(date: Date, lat: number, lon: number): number {
  const { sunrise, sunset, isDayAllDay, isNightAllDay } = getSunTimes(date, lat, lon);

  if (isDayAllDay) {
    const realHours = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
    const progress = realHours / 24;
    return (6 * 3600 + progress * 12 * 3600) % (24 * 3600);
  }
  if (isNightAllDay) {
    const realHours = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
    const progress = realHours / 24;
    return (18 * 3600 + progress * 12 * 3600) % (24 * 3600);
  }

  const realHours =
    date.getHours() +
    date.getMinutes() / 60 +
    date.getSeconds() / 3600 +
    date.getMilliseconds() / 3600000;

  const isDay = realHours >= sunrise && realHours < sunset;

  if (isDay) {
    const dayLength = sunset - sunrise;
    const b = ((12 - dayLength) * Math.PI) / (2 * dayLength);
    const x = realHours - sunrise;

    const temporalHoursElapsed =
      x + ((b * dayLength) / Math.PI) * (1 - Math.cos((Math.PI * x) / dayLength));

    return (6 + temporalHoursElapsed) * 3600;
  } else {
    const tomorrowSunrise = getSunTimes(
      new Date(date.getTime() + 24 * 60 * 60 * 1000),
      lat,
      lon,
    ).sunrise;
    const yesterdaySunset = getSunTimes(
      new Date(date.getTime() - 24 * 60 * 60 * 1000),
      lat,
      lon,
    ).sunset;

    let nightLength: number;
    let x: number;

    if (realHours >= sunset) {
      nightLength = 24 - sunset + tomorrowSunrise;
      x = realHours - sunset;
    } else {
      nightLength = 24 - yesterdaySunset + sunrise;
      x = 24 - yesterdaySunset + realHours;
    }

    const b = ((12 - nightLength) * Math.PI) / (2 * nightLength);
    const temporalHoursElapsed =
      x + ((b * nightLength) / Math.PI) * (1 - Math.cos((Math.PI * x) / nightLength));

    const temporalSeconds = (18 + temporalHoursElapsed) * 3600;
    return temporalSeconds % (24 * 3600);
  }
}

export function getCurrentSecondLength(date: Date, lat: number, lon: number): number {
  const { sunrise, sunset, isDayAllDay, isNightAllDay } = getSunTimes(date, lat, lon);

  if (isDayAllDay || isNightAllDay) {
    return 1.0;
  }

  const realHours =
    date.getHours() +
    date.getMinutes() / 60 +
    date.getSeconds() / 3600 +
    date.getMilliseconds() / 3600000;

  const isDay = realHours >= sunrise && realHours < sunset;

  if (isDay) {
    const dayLength = sunset - sunrise;
    const b = ((12 - dayLength) * Math.PI) / (2 * dayLength);
    const x = realHours - sunrise;
    const rate = 1 + b * Math.sin((Math.PI * x) / dayLength);
    return 1 / rate;
  } else {
    const tomorrowSunrise = getSunTimes(
      new Date(date.getTime() + 24 * 60 * 60 * 1000),
      lat,
      lon,
    ).sunrise;
    const yesterdaySunset = getSunTimes(
      new Date(date.getTime() - 24 * 60 * 60 * 1000),
      lat,
      lon,
    ).sunset;

    let nightLength: number;
    let x: number;

    if (realHours >= sunset) {
      nightLength = 24 - sunset + tomorrowSunrise;
      x = realHours - sunset;
    } else {
      nightLength = 24 - yesterdaySunset + sunrise;
      x = 24 - yesterdaySunset + realHours;
    }

    const b = ((12 - nightLength) * Math.PI) / (2 * nightLength);
    const rate = 1 + b * Math.sin((Math.PI * x) / nightLength);
    return 1 / rate;
  }
}

export function formatTemporalTime(temporalSeconds: number): string {
  const totalSeconds = Math.floor(temporalSeconds);
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
