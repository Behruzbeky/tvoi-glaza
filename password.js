// Приводит дату в любой записи к виду «7 мая»: «07.05», «7/5/2005», «0705», «7 май», «седьмое мая»,
// «7-го мая 2005 г.», «May 7», «7th of may», «7 may» (узб.), «мая 7». Общая для lock.js и scripts/build-assets.mjs.
(function (g) {
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  // начала названий месяцев: русские, английские, узбекские (латиница); порядок важен — «мар» раньше «ма»
  const MONTH_STEMS = [
    ['янв', 'jan', 'yan'], ['фев', 'feb', 'fev'], ['мар', 'mar'], ['апр', 'apr'], ['ма', 'may', 'mai'], ['июн', 'jun', 'iyun'],
    ['июл', 'jul', 'iyul'], ['авг', 'aug', 'avg'], ['сен', 'sep', 'sen'], ['окт', 'oct', 'okt'], ['ноя', 'nov', 'noy'], ['дек', 'dec', 'dek']
  ];
  // числительные словами: сначала 11–19 и десятки, потом единицы (иначе «семнадцать» поймается как «сем»)
  const NUM_STEMS = [
    ['одиннадц', 11], ['двенадц', 12], ['тринадц', 13], ['четырнадц', 14], ['пятнадц', 15], ['шестнадц', 16],
    ['семнадц', 17], ['восемнадц', 18], ['девятнадц', 19], ['двадцат', 20], ['тридцат', 30], ['десят', 10],
    ['перв', 1], ['один', 1], ['одн', 1], ['втор', 2], ['два', 2], ['двух', 2], ['трет', 3], ['три', 3], ['трех', 3],
    ['четв', 4], ['четыр', 4], ['пят', 5], ['шест', 6], ['седьм', 7], ['сем', 7], ['восьм', 8], ['восем', 8], ['девят', 9]
  ];
  const SKIP = new Set(['года', 'год', 'г', 'of', 'the', 'числа', 'число', 'yil', 'yilning']);

  const monthOf = t => MONTH_STEMS.findIndex(stems => stems.some(st => t.startsWith(st)));
  const numberWord = t => { const n = NUM_STEMS.find(([st]) => t.startsWith(st)); return n ? n[1] : 0; };

  function normalizePassword(raw) {
    const s = raw.toLowerCase().replace(/ё/g, 'е')
      .replace(/(\d)(st|nd|rd|th|го|ое|е|ого|-?chi)\b/g, '$1')
      .replace(/(\d)([a-zа-я])/g, '$1 $2').replace(/([a-zа-я])(\d)/g, '$1 $2')
      .replace(/[^0-9a-zа-я]+/g, ' ').trim();
    const tokens = s.split(' ').filter(t => t && !SKIP.has(t));
    if (!tokens.length) return raw.trim();

    let day = 0, month = -1;
    const nums = [];
    let wordDay = 0;
    for (const t of tokens) {
      if (/^\d+$/.test(t)) { nums.push(t); continue; }
      const m = monthOf(t);
      if (m >= 0 && month < 0) { month = m; continue; }
      wordDay += numberWord(t);
    }

    if (month >= 0) {
      day = nums.length ? +nums[0] : wordDay;
    } else if (nums.length === 1 && /^\d{3,4}$/.test(nums[0])) {
      day = +nums[0].slice(0, -2); month = +nums[0].slice(-2) - 1;   // «0705» → 7 мая
    } else if (nums.length >= 2) {
      day = +nums[0]; month = +nums[1] - 1;                          // день.месяц[.год]
    }
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) return `${day} ${MONTHS[month]}`;
    return raw.trim();
  }

  // Варианты для проверки: дата только цифрами может быть и в американском порядке «05/07» (месяц/день)
  function passwordCandidates(raw) {
    const out = [normalizePassword(raw)];
    const nums = raw.match(/\d+/g);
    if (nums && nums.length >= 2 && !/[a-zа-яё]/i.test(raw)) {
      const swapped = normalizePassword(`${nums[1]}.${nums[0]}`);
      if (!out.includes(swapped)) out.push(swapped);
    }
    return out;
  }

  g.normalizePassword = normalizePassword;
  g.passwordCandidates = passwordCandidates;
})(typeof window !== 'undefined' ? window : globalThis);
