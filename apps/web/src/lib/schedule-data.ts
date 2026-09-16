export type ScheduleEventType = "study" | "physical" | "rest" | "meal";

export interface ScheduleEvent {
	time: string;
	activity: string;
	type: ScheduleEventType;
}

export interface DaySchedule {
	dayOfWeek: number; // 0 = Minggu (Sun), 1 = Senin (Mon), ... 6 = Sabtu (Sat)
	dayName: string;
	theme: string;
	events: ScheduleEvent[];
}

export const MASTER_SCHEDULE: readonly DaySchedule[] = [
	{
		dayOfWeek: 1,
		dayName: "Senin",
		theme: "Day of Power (Fisik + CRC)",
		events: [
			{
				time: "06:30",
				activity: "Bangun ➔ Mandarin ➔ Sarapan DH + Madu + Creatine",
				type: "meal",
			},
			{
				time: "08:00 - 09:00",
				activity: "PJOK (kelas)",
				type: "physical",
			},
			{
				time: "09:00 - 10:00",
				activity: "GYM 🏋️",
				type: "physical",
			},
			{
				time: "10:00 - 13:00",
				activity: "CRC DEEP WORK (3 Jam)",
				type: "study",
			},
			{
				time: "13:00 - 14:00",
				activity: "LUNCH DH + Minyak Ikan + Tomat + Vit C",
				type: "meal",
			},
			{
				time: "14:00 - 16:00",
				activity: "PREP ALL MATKUL + Cheatsheet Consolidation (2 Jam)",
				type: "study",
			},
			{
				time: "16:00 - 17:30",
				activity: "Project & Portfolio Build / THINK.id",
				type: "study",
			},
			{
				time: "17:30 - 18:30",
				activity: "DINNER DH",
				type: "meal",
			},
			{
				time: "19:00 - 21:30",
				activity:
					"Deep Work 2: Tugas/PR + Logbook PJOK + Prep ringan (Fisika, Kalkulus, PDD, THEO)",
				type: "study",
			},
			{
				time: "21:30 - 22:30",
				activity: "Journal harian + Relax tanpa layar + magnesium",
				type: "rest",
			},
			{
				time: "23:00",
				activity: "TIDUR LELAP (Harga Mati) ✅",
				type: "rest",
			},
		],
	},
	{
		dayOfWeek: 2,
		dayName: "Selasa",
		theme: "The Marathon (08:00 - 20:00)",
		events: [
			{
				time: "06:30",
				activity: "Bangun ➔ Mandarin ➔ Sarapan DH + Madu + Creatine",
				type: "meal",
			},
			{
				time: "08:00 - 10:00",
				activity: "FISIKA 1 (Kelas)",
				type: "study",
			},
			{
				time: "10:00 - 11:00",
				activity: "KALKULUS 1 (Kelas)",
				type: "study",
			},
			{
				time: "11:00 - 12:00",
				activity:
					"PAHAMIN KONSEP FISIKA & KALKULUS LANGSUNG (1 Halaman Kertas + notebookLM)",
				type: "study",
			},
			{
				time: "12:00 - 12:50",
				activity: "LUNCH DH + Minyak Ikan + Tomat + Vit C",
				type: "meal",
			},
			{
				time: "12:50 - 14:00",
				activity: "Review THEO (PDD ga terlalu krusial, fokusin review THEO)",
				type: "study",
			},
			{
				time: "14:00 - 17:00",
				activity: "PENGANTAR DUNIA DIGITAL (PDD)",
				type: "study",
			},
			{
				time: "17:00 - 17:30",
				activity: "Review THEO, Update SDN",
				type: "study",
			},
			{
				time: "17:30 - 18:00",
				activity: "DINNER DH",
				type: "meal",
			},
			{
				time: "18:00 - 20:00",
				activity: "SURVEI TEOLOGI REFORMED 1 (THEO)",
				type: "study",
			},
			{
				time: "20:00",
				activity:
					"RECAP DAY (termasuk list tugas, belajar apa hari ini), PREP IDIS, PREP CODING",
				type: "study",
			},
			{
				time: "23:00",
				activity: "TIDUR ✅",
				type: "rest",
			},
		],
	},
	{
		dayOfWeek: 3,
		dayName: "Rabu",
		theme: "Prime Break (4 Jam Emas)",
		events: [
			{
				time: "06:30",
				activity: "Bangun ➔ Mandarin ➔ Sarapan DH + Madu + Creatine",
				type: "meal",
			},
			{
				time: "08:00 - 10:00",
				activity: "PENGANTAR ALGORITMA & PEMROGRAMAN (PAP)",
				type: "study",
			},
			{
				time: "10:00 - 12:00",
				activity: "CHAPEL (review IDIS)",
				type: "study",
			},
			{
				time: "12:00 - 13:00",
				activity: "LUNCH DH + Minyak Ikan + Tomat + Vit C",
				type: "meal",
			},
			{
				time: "13:00 - 15:00",
				activity: "PEMIKIRAN & PEMBELAJARAN KRISTEN (IDIS)",
				type: "study",
			},
			{
				time: "15:00 - 18:00",
				activity: "[PRIME TIME] CRC LAB MEETING & RESEARCH (3 Jam)",
				type: "study",
			},
			{
				time: "18:00 - 18:30",
				activity: "DINNER DH",
				type: "meal",
			},
			{
				time: "18:30 - 19:00",
				activity: "Review Kalkulus",
				type: "study",
			},
			{
				time: "19:00 - 20:00",
				activity: "KTB",
				type: "rest",
			},
			{
				time: "20:00 - 21:30",
				activity: "REVIEW PAP & IDIS + Prep & Review Kalkulus Kamis",
				type: "study",
			},
			{
				time: "21:30",
				activity: "Journal + Magnesium",
				type: "rest",
			},
			{
				time: "23:00",
				activity: "TIDUR ✅",
				type: "rest",
			},
		],
	},
	{
		dayOfWeek: 4,
		dayName: "Kamis",
		theme: "Kalkulus Day (Prioritas Indeks Prestasi)",
		events: [
			{
				time: "06:30",
				activity: "Bangun ➔ Mandarin ➔ Sarapan DH + Madu + Creatine",
				type: "meal",
			},
			{
				time: "08:00 - 10:00",
				activity: "KALKULUS 1 (Kelas)",
				type: "study",
			},
			{
				time: "10:00 - 11:30",
				activity: "PAHAMIN KONSEP KALKULUS LANGSUNG (notebookLM)",
				type: "study",
			},
			{
				time: "11:30 - 12:00",
				activity: "LUNCH DH + Minyak Ikan + Tomat + Vit C",
				type: "meal",
			},
			{
				time: "12:00 - 13:00",
				activity: "Latihan 3–5 Soal Kalkulus mandiri dari buku perpus",
				type: "study",
			},
			{
				time: "13:00 - 14:00",
				activity: "Prep modul Lab PAP",
				type: "study",
			},
			{
				time: "14:00 - 17:00",
				activity: "LAB PENGANTAR ALGORITMA & PEMROGRAMAN",
				type: "study",
			},
			{
				time: "17:00 - 18:00",
				activity: "DINNER DH",
				type: "meal",
			},
			{
				time: "18:00 - 19:00",
				activity: "Siapkan daftar soal Kalkulus yang tadi siang lo mentok",
				type: "study",
			},
			{
				time: "19:00 - 21:00",
				activity: "RESPONSI KALKULUS 1",
				type: "study",
			},
			{
				time: "21:00 - 22:30",
				activity:
					"CATAT BEBERAPA KONSEP PENTING RESPONSI + PREP FISIKA + PREP LAB FISIKA",
				type: "study",
			},
			{
				time: "22:30",
				activity: "Journal + Magnesium",
				type: "rest",
			},
			{
				time: "23:00",
				activity: "TIDUR ✅",
				type: "rest",
			},
		],
	},
	{
		dayOfWeek: 5,
		dayName: "Jumat",
		theme: "Weekly Closure (Tuntas Beban)",
		events: [
			{
				time: "06:30",
				activity: "Bangun ➔ Mandarin ➔ Sarapan DH + Madu + Creatine",
				type: "meal",
			},
			{
				time: "08:00 - 09:00",
				activity: "FISIKA 1",
				type: "study",
			},
			{
				time: "09:00 - 12:00",
				activity: "PRAKTIKUM FISIKA 1 (Lab)",
				type: "study",
			},
			{
				time: "12:00 - 13:00",
				activity: "LUNCH DH + Minyak Ikan + Tomat + Vit C",
				type: "meal",
			},
			{
				time: "13:00 - 15:00",
				activity:
					"WEEKLY MASTER CHEATSHEET COMPILATION (Satukan coretan minggu ini)",
				type: "study",
			},
			{
				time: "15:00 - 18:00",
				activity:
					"CRC DEEP WORK (3 Jam): Bedah 1 paper rujukan via prompt Gemini",
				type: "study",
			},
			{
				time: "18:00",
				activity: "DINNER DH",
				type: "meal",
			},
			{
				time: "18:30 - 23:00",
				activity:
					"100% FREE TIME. Lepas total semua urusan kuliah. Hangout, nonton, istirahatkan otak.",
				type: "rest",
			},
			{
				time: "23:00",
				activity: "TIDUR ✅",
				type: "rest",
			},
		],
	},
	{
		dayOfWeek: 6,
		dayName: "Sabtu",
		theme: "Gym, Build & Coding Day 🏋️",
		events: [
			{
				time: "08:00",
				activity: "Bangun santai ➔ Sarapan luar / Gofood",
				type: "meal",
			},
			{
				time: "09:00 - 10:30",
				activity: "SESI GYM 2 (Fokus Hypertrophy & Kebugaran) 🏋️",
				type: "physical",
			},
			{
				time: "11:00 - 13:00",
				activity: "CRC Exploratory Work ATAU Riset bebas",
				type: "study",
			},
			{
				time: "13:00 - 14:00",
				activity: "Makan siang santai",
				type: "meal",
			},
			{
				time: "14:00 - 16:30",
				activity:
					"Prep materi minggu depan (Skim SDN + Audio Overview) ➔ notebookLM",
				type: "study",
			},
			{
				time: "17:00 - 23:00",
				activity:
					"CODING SESSION DEDICATED: Garap Financial Scraper IDX + 1 Soal LeetCode E",
				type: "study",
			},
			{
				time: "23:00",
				activity: "TIDUR ✅",
				type: "rest",
			},
		],
	},
	{
		dayOfWeek: 0,
		dayName: "Minggu",
		theme: "Recharge & Weekly Review",
		events: [
			{
				time: "08:00 - 09:00",
				activity: "Sarapan santai",
				type: "meal",
			},
			{
				time: "09:30 - 11:30",
				activity: "IBADAH / GEREJA",
				type: "rest",
			},
			{
				time: "12:00 - 17:00",
				activity:
					"FREE TIME MURNI: Istirahat, tidur siang, jalan santai / PREP ALL MATKUL",
				type: "rest",
			},
			{
				time: "18:00 - 20:00",
				activity:
					"WEEKLY BOARD REVIEW (Wins: apa target kecentang? Lessons: kebocoran waktu? Action Plan: jadwal & voucher DH)",
				type: "study",
			},
			{
				time: "20:00 - 22:00",
				activity: "PREP ALL MATKUL + MAGNESIUM",
				type: "study",
			},
			{
				time: "23:00",
				activity: "TIDUR UNTUK MEMULAI SENIN DENGAN POWER ✅",
				type: "rest",
			},
		],
	},
];
