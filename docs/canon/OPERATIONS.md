# 26. HOMING & INSTRUMENT CHECK

The day begins with:

# HOMING & INSTRUMENT CHECK

This functions as structured morning intake.

Activities include:

- attendance;
- announcements;
- schedule verification;
- campus route notices;
- school-device checks;
- required material checks;
- special routing instructions;
- transportation information;
- building notices.

“Instrument” means instructional tools/equipment broadly.

It does not merely mean musical instruments.

---


# 27. PASSAGE

TEMHS's inter-class movement window is:

# PASSAGE

Passage is one of the most important visual systems in the game.

Before Passage:

- classrooms are active;
- hallways are relatively quiet.

When the current Pulse ends:

- teachers close instruction;
- students pack;
- chairs move;
- doors open;
- students leave;
- thousands of schedules advance;
- elevator demand spikes;
- stairs fill;
- corridors become crowded;
- lockers are used;
- staff supervise intersections;
- teachers relocate;
- custodians adapt;
- routing systems change.

After Passage:

- NPCs arrive;
- classes begin;
- corridors become quiet again.

Do NOT suddenly spawn a crowd in the corridor.

The crowd must originate logically from classrooms and nearby spaces.

---


# 28. CONTROLLED PASSAGE

TEMHS can modify circulation dynamically.

Supported route states:

- bidirectional;
- one-way;
- temporary hold;
- restricted transfer;
- alternate route;
- stair priority;
- elevator restriction;
- construction diversion.

NPC navigation must recognize these states.

---


# 29. NORTHWARD RELEASE

Established TEMHS circulation procedure:

# NORTHWARD RELEASE

Certain student groups are released toward designated northern circulation routes before opposing traffic proceeds.

Represent it using:

- schedule logic;
- signs;
- staff supervision;
- announcements;
- temporary directional routing.

It should look organized and institutional, not militarized.

---


# 30. STILL BELL V

Established TEMHS operational signal:

# STILL BELL V

During Still Bell V, affected occupants remain in their assigned rooms instead of entering Passage.

Possible purposes include:

- ventilation equalization;
- environmental response;
- circulation stabilization.

When active:

- classes temporarily remain in rooms;
- doors stay closed;
- hallways become quieter;
- teachers understand what is happening;
- displays indicate the hold.

It is NOT automatically a lockdown.

Do not use lockdown behavior unless the simulation explicitly triggers a separate appropriate event.

---


# 31. MEAL ROTATIONS

Lunch is distributed across multiple meal groups.

Use:

- Meal A;
- Meal B;
- Meal C;
- additional groups where system capacity requires them.

TEMHS cannot feed 30,000 students simultaneously in one room.

Use distributed dining infrastructure and staggered schedules.

NPCs know:

- assigned meal group;
- assigned eating destination;
- route;
- return time.

---


# 32. TERMINAL RELEASE

TEMHS does not release the entire institution simultaneously.

Dismissal occurs through:

# TERMINAL RELEASE WAVES

Different divisions/zones release in stages.

During dismissal:

- selected wings empty first;
- traffic redistributes;
- stairs change density;
- elevators crowd;
- exits become active;
- clubs remain;
- athletes relocate;
- staff begin meetings;
- custodians increase operations;
- facilities begin evening work.

---


# 33. SCHOOL-DAY STATES

Create a world-state controller supporting:

1. PRE-ARRIVAL
2. ARRIVAL
3. HOMING
4. ACADEMIC PULSE
5. PASSAGE
6. MEAL ROTATION
7. AFTERNOON PULSES
8. TERMINAL RELEASE
9. AFTER-SCHOOL
10. EVENING FACILITIES MODE

The campus must visibly behave differently in each state.

---
