export interface RadarAxisSpec {
  id: string;
  shortLabel: string;
  fullLabel: string;
  aspectId: string;
}

export const RADAR_AXES_DATA: RadarAxisSpec[] = [
  {
    id: 'focus',
    shortLabel: 'Фокус',
    fullLabel: 'Ясность и AMPA-фокус',
    aspectId: 'alpha4beta2-clarity'
  },
  {
    id: 'dopamine',
    shortLabel: 'Дофамин D2',
    fullLabel: 'Чистый дофамин D2',
    aspectId: 'tonic-dopamine'
  },
  {
    id: 'vessels',
    shortLabel: 'Сосуды eNOS',
    fullLabel: 'Потенция и сосуды eNOS',
    aspectId: 'enos-vascular-potency'
  },
  {
    id: 'composure',
    shortLabel: 'Спокойствие',
    fullLabel: 'Выдержка и вагус',
    aspectId: 'cortisol-composure'
  },
  {
    id: 'oxygen',
    shortLabel: 'Кислород АТФ',
    fullLabel: 'Кислород и АТФ',
    aspectId: 'atp-oxygen-energy'
  },
  {
    id: 'sleep',
    shortLabel: 'Сон N3',
    fullLabel: 'Глубокий сон N3',
    aspectId: 'n3-deep-sleep'
  }
];

export interface CircadianSlotPoint {
  hour: number;
  timeLabel: string;
  cholineAch: number;
  noopeptCpg: number;
  stepsIrisinEnos: number;
  adenosineSleepDrive: number;
  protocolHeadline: string;
  protocolNote: string;
}

export const CIRCADIAN_24H_DATA: CircadianSlotPoint[] = [
  {
    hour: 7,
    timeLabel: '07:00',
    cholineAch: 62,
    noopeptCpg: 48,
    stepsIrisinEnos: 44,
    adenosineSleepDrive: 14,
    protocolHeadline: 'Подъём после фазы N3',
    protocolNote:
      'Аденозин обнулён за ночь глимфатической промывкой; утренний кортизол пробуждения запускает бодрость без сигареты.'
  },
  {
    hour: 8,
    timeLabel: '08:00',
    cholineAch: 92,
    noopeptCpg: 88,
    stepsIrisinEnos: 64,
    adenosineSleepDrive: 18,
    protocolHeadline: 'Приём №1: Церитон −20м → Яйца С0 + Чай → Ноопепт',
    protocolNote:
      'За 20 мин до завтрака Церитон 400 мг с водой; следом 2 сырых яйца С0, сложные угли, крепкий чай с 3 ложками сахара и Ноопепт 10 мг сразу после еды.'
  },
  {
    hour: 10.5,
    timeLabel: '10:30',
    cholineAch: 95,
    noopeptCpg: 92,
    stepsIrisinEnos: 74,
    adenosineSleepDrive: 28,
    protocolHeadline: 'Пик ChAT и AMPA-фокуса',
    protocolNote:
      'Ноопепт усиливает захват глюкозы через ГЭБ: 100% холина конвертируется в ацетилхолин при 0% перекусов натощак.'
  },
  {
    hour: 13,
    timeLabel: '13:00',
    cholineAch: 94,
    noopeptCpg: 90,
    stepsIrisinEnos: 82,
    adenosineSleepDrive: 40,
    protocolHeadline: 'Приём №2: Церитон −20м → Обед + Чай → Ноопепт',
    protocolNote:
      'Церитон 400 мг за 20 мин до обеда с водой, плотные сложные угли + крепкий чай с 3 ложками сахара (CYP1A2 замедлен) и Ноопепт 10 мг сразу после еды.'
  },
  {
    hour: 15.5,
    timeLabel: '15:30',
    cholineAch: 91,
    noopeptCpg: 86,
    stepsIrisinEnos: 86,
    adenosineSleepDrive: 54,
    protocolHeadline: 'Щит АД и гликоген на 20к',
    protocolNote:
      'Буферная волна глюкозы поверх обеда питает префронтальную кору и гликоген мышц на 20 000 шагов; 0% семечек стирают рефлекс рук.'
  },
  {
    hour: 17,
    timeLabel: '17:00',
    cholineAch: 93,
    noopeptCpg: 89,
    stepsIrisinEnos: 92,
    adenosineSleepDrive: 66,
    protocolHeadline: 'Приём №3 (<17:30): Церитон −20м → Еда → Ноопепт',
    protocolNote:
      'Церитон 400 мг за 20 мин до еды, сложные угли со сладким чаем и финальная таблетка Ноопепта 10 мг сразу после еды строго до 17:30.'
  },
  {
    hour: 19.5,
    timeLabel: '19:30',
    cholineAch: 84,
    noopeptCpg: 64,
    stepsIrisinEnos: 98,
    adenosineSleepDrive: 82,
    protocolHeadline: 'Финиш нормы 20 000 шагов',
    protocolNote:
      'Пик сдвигового оксида азота (eNOS) и выброс мышечного иризина (FNDC5), перемалывающего весь дневной кортизол.'
  },
  {
    hour: 21.5,
    timeLabel: '21:30',
    cholineAch: 74,
    noopeptCpg: 38,
    stepsIrisinEnos: 88,
    adenosineSleepDrive: 92,
    protocolHeadline: 'Тёплое молоко с 3 ложками сахара и вагус',
    protocolNote:
      'Кружка тёплого молока с 3 ложками сахара даёт триптофан и ровный гликоген на ночь; сосуды расширены NO от шага, пульс опускается в штиль.'
  },
  {
    hour: 23,
    timeLabel: '23:00',
    cholineAch: 68,
    noopeptCpg: 20,
    stepsIrisinEnos: 78,
    adenosineSleepDrive: 98,
    protocolHeadline: '98% аденозина → дельта-сон N3',
    protocolNote:
      'Лавина внеклеточного аденозина от 20 000 шагов мгновенно погружает мозг в фазу N3 и ночной синтез тестостерона.'
  }
];

export const CIRCADIAN_ANCHOR_HOURS = [8, 13, 17, 23] as const;
