export type Stream = 'scientific';

export interface Exam {
  id: string;
  subject: string;
  date: string; // ISO string 2026-01-XX
  stream?: Stream | 'common'; 
}

export const EXAMS: Exam[] = [
  // Phase 1 (Common)
  { id: 'ex1', subject: 'اللغة الأجنبية الثانية + تربية عسكرية (عملي)', date: '2026-01-03T09:00:00', stream: 'common' },
  { id: 'ex2', subject: 'تربية دينية', date: '2026-01-04T09:00:00', stream: 'common' },
  { id: 'ex3', subject: 'تربية وطنية + تربية عسكرية (نظري)', date: '2026-01-05T09:00:00', stream: 'common' },

  // Phase 2 (Main Exams)
  { id: 'ex4', subject: 'اللغة العربية', date: '2026-01-10T09:00:00', stream: 'common' },
  { id: 'ex5', subject: 'اللغة الأجنبية الأولى', date: '2026-01-11T09:00:00', stream: 'common' },
  
  // Scientific
  { id: 'ex6_sci', subject: 'رياضيات بحتة', date: '2026-01-12T09:00:00', stream: 'scientific' },
  { id: 'ex7_sci', subject: 'فيزياء', date: '2026-01-13T09:00:00', stream: 'scientific' },
  { id: 'ex8_sci', subject: 'كيمياء', date: '2026-01-14T09:00:00', stream: 'scientific' },
  { id: 'ex9_sci', subject: 'تطبيقات الرياضيات', date: '2026-01-15T09:00:00', stream: 'scientific' },
];

export const getExamsByStream = (stream: Stream): Exam[] => {
  return EXAMS.filter(exam => exam.stream === 'common' || exam.stream === stream);
};

