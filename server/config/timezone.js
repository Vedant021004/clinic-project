/**
 * Timezone and clinic operating hours calculation utility for Asia/Kolkata (IST)
 */

export const TIMEZONE = process.env.TIMEZONE || 'Asia/Kolkata';

/**
 * Returns current Date object shifted to Asia/Kolkata time
 */
export function getKolkataTime() {
  const now = new Date();
  const kolkataDateString = now.toLocaleString('en-US', { timeZone: TIMEZONE });
  return new Date(kolkataDateString);
}

/**
 * Calculates real-time clinic status (OPEN, CLOSED, CLOSING_SOON)
 * @param {Object|string} openingHours - JSON or Object containing schedule
 * @returns {Object} { status: "OPEN"|"CLOSED"|"CLOSING_SOON", isOpen: boolean, text: string, currentDay: number }
 */
export function calculateClinicStatus(openingHours) {
  let scheduleData = openingHours;
  if (typeof openingHours === 'string') {
    try {
      scheduleData = JSON.parse(openingHours);
    } catch (e) {
      return { status: "CLOSED", isOpen: false, text: "Hours unavailable" };
    }
  }

  const nowIST = getKolkataTime();
  const day = nowIST.getDay(); // 0 = Sunday, 1..6 = Mon..Sat
  const schedule = scheduleData.schedule ? scheduleData.schedule[day] : scheduleData[day];

  if (!schedule) {
    return {
      status: "CLOSED",
      isOpen: false,
      text: "Closed Today",
      currentDay: day
    };
  }

  const [openH, openM] = schedule.open.split(':').map(Number);
  const [closeH, closeM] = schedule.close.split(':').map(Number);

  const currentMinutes = nowIST.getHours() * 60 + nowIST.getMinutes();
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  const formatHour = (h, m) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
    const remainingMinutes = closeMinutes - currentMinutes;
    if (remainingMinutes <= 60) {
      return {
        status: "CLOSING_SOON",
        isOpen: true,
        text: `Open • Closes soon (${remainingMinutes}m left)`,
        remainingMinutes,
        currentDay: day
      };
    }
    return {
      status: "OPEN",
      isOpen: true,
      text: `Open Now • Closes at ${formatHour(closeH, closeM)}`,
      currentDay: day
    };
  } else if (currentMinutes < openMinutes) {
    return {
      status: "CLOSED",
      isOpen: false,
      text: `Closed • Opens today at ${formatHour(openH, openM)}`,
      currentDay: day
    };
  } else {
    return {
      status: "CLOSED",
      isOpen: false,
      text: "Closed for the day",
      currentDay: day
    };
  }
}
