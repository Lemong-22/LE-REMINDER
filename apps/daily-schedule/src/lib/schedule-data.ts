export type ScheduleEventType = "class" | "study" | "rest" | "routine";

export interface ScheduleEvent {
	time: string;
	activity: string;
	type: ScheduleEventType;
}

export interface DaySchedule {
	dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
	dayName: string;
	events: ScheduleEvent[];
}

export const SCHEDULE_DATA: readonly DaySchedule[] = [
	{
		dayOfWeek: 1,
		dayName: "Monday",
		events: [
			{
				time: "09.00 - 09.30",
				activity: "Routine (Bangun tidur/mandi)",
				type: "routine",
			},
			{
				time: "09.30 - 11.30",
				activity: "Study (Fisika 1)",
				type: "study",
			},
			{
				time: "11.30 - 13.00",
				activity: "Rest",
				type: "rest",
			},
			{
				time: "13.00 - 14.00",
				activity: "Study (Prep Kimia)",
				type: "study",
			},
			{
				time: "14.00 - 17.00",
				activity: "Class (Kimia)",
				type: "class",
			},
			{
				time: "17.00 - 18.30",
				activity: "Rest",
				type: "rest",
			},
			{
				time: "18.30 - 19.30",
				activity: "Study (KTB)",
				type: "study",
			},
			{
				time: "19.30 - 20.00",
				activity: "Rest (Waktu luang)",
				type: "rest",
			},
			{
				time: "20.00 - 23.00",
				activity: "Study (Kalkulus)",
				type: "study",
			},
		],
	},
	{
		dayOfWeek: 2,
		dayName: "Tuesday",
		events: [
			{
				time: "07.20 - 08.00",
				activity: "Routine",
				type: "routine",
			},
			{
				time: "08.00 - 10.00",
				activity: "Class (Fisika)",
				type: "class",
			},
			{
				time: "10.00 - 11.00",
				activity: "Rest",
				type: "rest",
			},
			{
				time: "11.00 - 12.00",
				activity: "Class (Kalkulus 1)",
				type: "class",
			},
			{
				time: "12.00 - 12.50",
				activity: "Rest",
				type: "rest",
			},
			{
				time: "12.50 - 16.00",
				activity: "Class (Lab Fisika)",
				type: "class",
			},
			{
				time: "16.00 - 17.50",
				activity: "Rest",
				type: "rest",
			},
			{
				time: "17.50 - 20.30",
				activity: "Class (Teologi)",
				type: "class",
			},
			{
				time: "20.30 - 21.45",
				activity: "Rest",
				type: "rest",
			},
			{
				time: "21.45 - 22.45",
				activity: "Study (IDIS)",
				type: "study",
			},
		],
	},
	{
		dayOfWeek: 3,
		dayName: "Wednesday",
		events: [
			{
				time: "08.40 - 10.00",
				activity: "Routine",
				type: "routine",
			},
			{
				time: "10.00 - 12.00",
				activity: "Routine (Chapel)",
				type: "routine",
			},
			{
				time: "12.00 - 12.50",
				activity: "Rest",
				type: "rest",
			},
			{
				time: "12.50 - 15.00",
				activity: "Class (IDIS)",
				type: "class",
			},
			{
				time: "15.00 - 20.00",
				activity: "Rest",
				type: "rest",
			},
			{
				time: "20.00 - 21.30",
				activity: "Study (REVIEW PAP & IDIS + Prep & Review Kalkulus Kamis)",
				type: "study",
			},
			{
				time: "21.30 - 23.00",
				activity: "Rest",
				type: "rest",
			},
		],
	},
	{
		dayOfWeek: 4,
		dayName: "Thursday",
		events: [
			{
				time: "07.20 - 07.55",
				activity: "Routine",
				type: "routine",
			},
			{
				time: "07.55 - 10.00",
				activity: "Class (PAP)",
				type: "class",
			},
			{
				time: "10.00 - 12.00",
				activity: "Class (Kalkulus)",
				type: "class",
			},
			{
				time: "12.00 - 13.50",
				activity: "Rest",
				type: "rest",
			},
			{
				time: "13.50 - 14.00",
				activity: "Routine",
				type: "routine",
			},
			{
				time: "14.00 - 17.00",
				activity: "Class (Lab Kimia)",
				type: "class",
			},
			{
				time: "17.00 - 18.50",
				activity: "Rest",
				type: "rest",
			},
			{
				time: "18.50 - 19.00",
				activity: "Rest",
				type: "rest",
			},
			{
				time: "19.00 - 21.30",
				activity: "Study (Responsi)",
				type: "study",
			},
			{
				time: "21.30 - 23.00",
				activity: "Study (Review)",
				type: "study",
			},
		],
	},
	{
		dayOfWeek: 5,
		dayName: "Friday",
		events: [
			{
				time: "07.20 - 08.00",
				activity: "Routine",
				type: "routine",
			},
			{
				time: "08.00 - 09.00",
				activity: "Class (Fisika)",
				type: "class",
			},
			{
				time: "09.00 - 12.00",
				activity: "Class (Lab PAP)",
				type: "class",
			},
			{
				time: "12.00 - 14.30",
				activity: "Rest",
				type: "rest",
			},
			{
				time: "14.30 - 16.30",
				activity: "Study (Kimia)",
				type: "study",
			},
			{
				time: "16.30 - 18.30",
				activity: "Rest",
				type: "rest",
			},
			{
				time: "18.30 - 23.00",
				activity: "Study (Review)",
				type: "study",
			},
		],
	},
	{
		dayOfWeek: 6,
		dayName: "Saturday",
		events: [
			{
				time: "09.30 - 14.00",
				activity: "Rest (Healing)",
				type: "rest",
			},
			{
				time: "14.00 - 17.00",
				activity: "Study (Menyelesaikan tugas)",
				type: "study",
			},
			{
				time: "17.00 - 19.30",
				activity: "Rest",
				type: "rest",
			},
			{
				time: "19.30 - 23.00",
				activity: "Study (Lanjut tugas)",
				type: "study",
			},
		],
	},
	{
		dayOfWeek: 0,
		dayName: "Sunday",
		events: [
			{
				time: "08.00 - 09.00",
				activity: "Routine",
				type: "routine",
			},
			{
				time: "09.00 - 12.00",
				activity: "Routine (Gereja)",
				type: "routine",
			},
			{
				time: "12.00 - 19.30",
				activity: "Rest",
				type: "rest",
			},
			{
				time: "19.30 - 23.00",
				activity: "Study (Belajar)",
				type: "study",
			},
		],
	},
];
