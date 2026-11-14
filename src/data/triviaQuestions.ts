import { TriviaQuestion } from '../types/game';

export const TRIVIA_EXPEDITION_QUESTIONS: TriviaQuestion[] = [
  {
    id: 'geo_rust',
    category: 'Geology',
    question: 'What mineral gives the Martian soil and sky their famous rusty-red hue?',
    options: [
      'Copper sulfate crystals',
      'Iron oxide (hematite rust)',
      'Sulfur volcanic ash',
      'Magnesium carbonate',
    ],
    correctIndex: 1,
    explanation:
      'Martian regolith is packed with fine iron-oxide dust formed billions of years ago when iron-rich rocks reacted with ancient oxygen and water.',
    xpReward: 100,
  },
  {
    id: 'geo_olympus',
    category: 'Geology',
    question: 'Why did Olympus Mons grow nearly 3× taller than Mount Everest on Earth?',
    options: [
      'Mars lacks shifting tectonic plates, so lava piled in one spot',
      'Mars has stronger gravity that compresses mountains flat',
      'Giant asteroid impacts pushed the peak upward',
      'Freezing polar winds sculpted ice cones over lava',
    ],
    correctIndex: 0,
    explanation:
      'Without moving tectonic plates, a Martian hotspot stayed fixed beneath the crust for hundreds of millions of years, building a shield volcano 21.9 km high!',
    xpReward: 125,
  },
  {
    id: 'geo_canyon',
    category: 'Geology',
    question: 'How would Valles Marineris compare if placed on the United States?',
    options: [
      'Roughly the size of the Grand Canyon',
      'About the width of Texas',
      'Stretching almost coast-to-coast from New York to Los Angeles',
      'Smaller than a lunar crater',
    ],
    correctIndex: 2,
    explanation:
      'Valles Marineris stretches over 4,000 km (2,500 miles) across Mars—making the Grand Canyon look tiny by comparison!',
    xpReward: 125,
  },
  {
    id: 'geo_blueberries',
    category: 'Geology',
    question: 'What are the tiny sphere-shaped rocks nicknamed "Martian blueberries" found by Opportunity?',
    options: [
      'Frozen methane hailstones',
      'Hematite concretions formed in ancient groundwater',
      'Micro-meteorite glass beads',
      'Fossilized blue algae colonies',
    ],
    correctIndex: 1,
    explanation:
      'These mineral spheres of gray hematite formed inside wet sediment billions of years ago—key evidence that liquid water once soaked Martian rock!',
    xpReward: 150,
  },
  {
    id: 'geo_hellas',
    category: 'Geology',
    question: 'What is Hellas Planitia, one of the lowest elevation points on Mars?',
    options: [
      'A dry tectonic rift valley',
      'A colossal 2,300-km-wide ancient impact basin',
      'A collapsed underground lava tube',
      'A sunken glacier sea',
    ],
    correctIndex: 1,
    explanation:
      'Hellas Basin was carved by a massive asteroid impact early in Martian history, plunging more than 7 km below the surrounding plains.',
    xpReward: 150,
  },
  {
    id: 'atmo_pressure',
    category: 'Atmosphere',
    question: 'Roughly how dense is the atmosphere at the Martian surface compared to Earth at sea level?',
    options: [
      'About 50% as dense',
      'Less than 1% of Earth’s surface pressure',
      'Twice as dense due to carbon dioxide',
      'Roughly 25% of Earth’s pressure',
    ],
    correctIndex: 1,
    explanation:
      'Mars averages just 6.1 millibars of surface pressure—less than 1% of Earth’s 1,013 millibars, equivalent to flying 35 km high in Earth’s stratosphere!',
    xpReward: 125,
  },
  {
    id: 'atmo_sunset',
    category: 'Atmosphere',
    question: 'What color do sunsets near the horizon appear on Mars?',
    options: [
      'Vivid neon green',
      'Cool dusty blue',
      'Deep violet-purple',
      'Bright lemon yellow',
    ],
    correctIndex: 1,
    explanation:
      'Fine Martian dust scatters red light at wide angles while letting blue wavelengths pass forward near the Sun, creating eerie blue twilights!',
    xpReward: 125,
  },
  {
    id: 'atmo_storms',
    category: 'Atmosphere',
    question: 'How large can major Martian dust storms grow during southern spring and summer?',
    options: [
      'No larger than a single crater',
      'Up to regional 100 km clouds only',
      'Planet-encircling storms covering all of Mars for weeks',
      'They only occur near the North Pole',
    ],
    correctIndex: 2,
    explanation:
      'Sunlight warms airborne dust, strengthening winds until giant storms merge into global dust shrouds that can blanket Mars for months.',
    xpReward: 125,
  },
  {
    id: 'atmo_dryice',
    category: 'Atmosphere',
    question: 'During Martian winter, what happens to up to 30% of the planet’s carbon dioxide atmosphere?',
    options: [
      'It escapes completely into space',
      'It freezes onto the polar caps as dry ice snow',
      'It converts into liquid oceans',
      'It gets absorbed by Martian dust storms',
    ],
    correctIndex: 1,
    explanation:
      'Martian winters drop below -125°C, causing CO2 gas to freeze directly out of the air onto the seasonal polar ice caps!',
    xpReward: 150,
  },
  {
    id: 'atmo_sound',
    category: 'Atmosphere',
    question: 'How does sound travel in Mars’s thin CO2 atmosphere compared to Earth?',
    options: [
      'Louder and farther than on Earth',
      'Softer, muffled, and slower (~240 m/s), especially for low pitches',
      'Identical speed and volume to Earth',
      'Sound travels instantaneously without air',
    ],
    correctIndex: 1,
    explanation:
      'Perseverance’s microphones proved Martian sound travels around 240 m/s (vs 343 m/s on Earth), and high-pitched noises actually travel slightly faster than bass!',
    xpReward: 175,
  },
  {
    id: 'mis_ingenuity',
    category: 'Missions',
    question: 'What historic milestone did NASA’s Ingenuity helicopter achieve on Mars in 2021?',
    options: [
      'First underground cavern drilling',
      'First powered, controlled aerodynamic flight on another planet',
      'First round-trip sample return to Earth',
      'First human-crewed landing',
    ],
    correctIndex: 1,
    explanation:
      'Ingenuity spun twin carbon-fiber blades at ~2,500 RPM to lift off in Mars’s 1% air density—completing 72 flights far beyond its 5-flight test goal!',
    xpReward: 125,
  },
  {
    id: 'mis_moxie',
    category: 'Missions',
    question: 'What life-saving resource did Perseverance’s MOXIE experiment produce right from Martian air?',
    options: [
      'Liquid rocket methane',
      'Breathable oxygen (O2) split from CO2',
      'Fresh desalinated drinking water',
      'Hydrogen fuel cells',
    ],
    correctIndex: 1,
    explanation:
      'MOXIE electrolyzed Martian carbon dioxide into pure oxygen—proving future astronauts can manufacture breathable air and rocket oxidizer locally!',
    xpReward: 150,
  },
  {
    id: 'mis_viking',
    category: 'Missions',
    question: 'Which pair of 1976 spacecraft became the first U.S. landers to operate long-term on Mars?',
    options: [
      'Apollo 15 & 16',
      'Viking 1 & Viking 2',
      'Pathfinder & Sojourner',
      'Mariner 4 & Mariner 9',
    ],
    correctIndex: 1,
    explanation:
      'Viking 1 and 2 touched down in 1976, transmitting the first crisp color panoramas of Mars’s boulder-strewn plains and running soil biology tests.',
    xpReward: 125,
  },
  {
    id: 'mis_rtg',
    category: 'Missions',
    question: 'How does the Curiosity Rover stay powered even during dust storms and cold Martian nights?',
    options: [
      'Wind turbine sails mounted on its mast',
      'A nuclear Radioisotope Thermoelectric Generator (MMRTG)',
      'Subsurface geothermal cables',
      'Giant lithium batteries recharged weekly from orbit',
    ],
    correctIndex: 1,
    explanation:
      'Unlike solar-powered rovers that risk dust buildup, Curiosity converts heat from decaying Plutonium-238 into steady electricity day and night.',
    xpReward: 125,
  },
  {
    id: 'mis_jezero',
    category: 'Missions',
    question: 'Why was Jezero Crater chosen as Perseverance’s landing site?',
    options: [
      'It is the flattest ice sheet on Mars',
      'It contains an ancient river delta that once emptied into a crater lake',
      'It sits directly on top of Olympus Mons',
      'It shields rovers from all Martian radiation',
    ],
    correctIndex: 1,
    explanation:
      'Orbiters spotted clay minerals and a preserved fan-shaped river delta in Jezero Crater—a prime hunting ground for signs of ancient microbial life!',
    xpReward: 150,
  },
  {
    id: 'orb_phobos',
    category: 'Moons & Orbit',
    question: 'How often does Mars’s larger moon Phobos rise and set in the Martian sky?',
    options: [
      'Once every 28 Earth days',
      'Roughly twice every Martian Sol, rising in the west and setting in the east!',
      'It never moves—it stays locked over one crater',
      'Only once per Martian year',
    ],
    correctIndex: 1,
    explanation:
      'Phobos orbits Mars every 7 hours 39 minutes—faster than Mars spins! As a result, explorers see Phobos rise in the WEST and race across the sky to set in the EAST.',
    xpReward: 175,
  },
  {
    id: 'orb_year',
    category: 'Moons & Orbit',
    question: 'Approximately how long does it take Mars to complete one full orbit (year) around the Sun?',
    options: [
      '365 Earth days',
      '687 Earth days (about 1.88 Earth years)',
      '120 Earth days',
      '1,400 Earth days',
    ],
    correctIndex: 1,
    explanation:
      'Orbiting farther from the Sun at ~1.52 AU, Mars takes 687 Earth days (668.6 Sols) to finish one Martian year!',
    xpReward: 100,
  },
  {
    id: 'orb_tilt',
    category: 'Moons & Orbit',
    question: 'Why does Mars experience four distinct seasons similar to Earth’s?',
    options: [
      'Its axial tilt is ~25.2 degrees, close to Earth’s 23.4 degrees',
      'Its two moons pull ocean tides around the planet',
      'Solar flares warm one hemisphere each month',
      'Olympus Mons blocks sunlight during summer',
    ],
    correctIndex: 0,
    explanation:
      'Because Mars tilts 25.2° on its axis, it has spring, summer, autumn, and winter—each lasting roughly twice as long as Earth’s seasons.',
    xpReward: 125,
  },
  {
    id: 'orb_gravity',
    category: 'Moons & Orbit',
    question: 'If you weigh 100 kg (about 220 lbs) on Earth, what would your weight feel like on Mars?',
    options: [
      'About 16 kg (like the Moon)',
      'About 38 kg (38% of Earth gravity)',
      'About 85 kg (almost the same as Earth)',
      'Zero kilograms (weightless)',
    ],
    correctIndex: 1,
    explanation:
      'With surface gravity at ~3.72 m/s² (38% of Earth’s 9.81 m/s²), astronauts can bound much higher and carry heavier equipment with ease!',
    xpReward: 100,
  },
  {
    id: 'surv_suits',
    category: 'Human Survival',
    question: 'What would happen to an astronaut stepping outside on Mars without a pressurized spacesuit?',
    options: [
      'They could hold their breath safely for 20 minutes',
      'The near-vacuum pressure (~6 mbar) would cause fluids to boil and immediate unconsciousness in ~15 seconds',
      'Only their helmet visor would fog over',
      'Mars’s CO2 air would boost their stamina',
    ],
    correctIndex: 1,
    explanation:
      'At 0.6% Earth pressure, Mars sits below the Armstrong limit—meaning body fluids vaporize at normal temperature and oxygen leaves the blood rapidly without a pressurized suit.',
    xpReward: 125,
  },
  {
    id: 'surv_rad',
    category: 'Human Survival',
    question: 'Why must Mars habitats use thick regolith shielding or lava tubes for astronaut quarters?',
    options: [
      'To protect against cosmic rays and solar storms since Mars lacks a global magnetic field',
      'To stop aggressive Martian wildlife',
      'To reflect excessive heat during scorching 90°C afternoons',
      'To stabilize tectonic earthquakes',
    ],
    correctIndex: 0,
    explanation:
      'Without a global magnetosphere or thick ozone layer, cosmic and solar radiation reach the surface easily—making dirt berms or underground shelters crucial.',
    xpReward: 150,
  },
  {
    id: 'surv_temp',
    category: 'Human Survival',
    question: 'What is the average surface temperature across Mars?',
    options: [
      'A mild +18°C (64°F)',
      'A freezing -63°C (-81°F), swinging wildly between day and night',
      'A boiling +140°C (284°F)',
      'Constant -5°C year-round',
    ],
    correctIndex: 1,
    explanation:
      'Equatorial summer afternoons can briefly hit +20°C near your boots, while thin air drops nighttime lows below -100°C—requiring heated habitats and suits.',
    xpReward: 125,
  },
  {
    id: 'surv_soil',
    category: 'Human Survival',
    question: 'What toxic chemical compound in Martian soil must be washed out before growing Earth crops?',
    options: [
      'Pure table salt',
      'Perchlorates',
      'Liquid mercury pools',
      'Battery acid rain',
    ],
    correctIndex: 1,
    explanation:
      'Martian dirt contains ~0.5–1% perchlorate salts, which disrupt human thyroid function—so future greenhouses will rinse or bio-remediate soil first.',
    xpReward: 175,
  },
  {
    id: 'surv_comm',
    category: 'Human Survival',
    question: 'Why can’t astronauts on Mars have instant live phone calls with families on Earth?',
    options: [
      'Mars blocks all radio waves',
      'Light-speed signal delay ranges from 3 to 22 minutes each way depending on planetary positions',
      'Earth satellites face the wrong direction',
      'Microphones don’t work inside pressurized domes',
    ],
    correctIndex: 1,
    explanation:
      'Even at the speed of light (~300,000 km/s), Mars sits 55 million to 400 million km away, creating a 6-to-44-minute round-trip conversation delay!',
    xpReward: 125,
  },
  // --- Expanded Geology Questions ---
  {
    id: 'geo_tharsis',
    category: 'Geology',
    question: 'What enormous volcanic plateau hosts Olympus Mons and three giant aligned shield volcanoes?',
    options: [
      'Tharsis Bulge',
      'Syrtis Major Planum',
      'Elysium Basin',
      'Arcadia Trench',
    ],
    correctIndex: 0,
    explanation:
      'The Tharsis volcanic rise is thousands of kilometers wide and holds Arsia, Pavonis, and Ascraeus Mons alongside neighboring Olympus Mons.',
    xpReward: 150,
  },
  {
    id: 'geo_gale',
    category: 'Geology',
    question: 'What 5.5-km-tall layered mountain sits inside Gale Crater, the site explored by the Curiosity rover?',
    options: [
      'Mount Sharp (Aeolis Mons)',
      'Mons Huygens',
      'Arsia Peak',
      'Maxwell Montes',
    ],
    correctIndex: 0,
    explanation:
      'Mount Sharp’s sedimentary layers preserve billions of years of Martian climate shifts from wet clay lakebeds to dry sulfate deserts.',
    xpReward: 125,
  },
  {
    id: 'geo_dichotomy',
    category: 'Geology',
    question: 'How do Mars’s northern and southern hemispheres dramatically differ in elevation and crust?',
    options: [
      'The north is mountainous while the south is pure liquid ocean',
      'The north consists of smooth low-elevation plains, while the south is rugged heavily cratered highlands',
      'Both hemispheres have identical flat basalt plains',
      'The southern hemisphere sits at lower elevation due to polar melting',
    ],
    correctIndex: 1,
    explanation:
      'Known as the Martian crustal dichotomy, the northern lowlands sit kilometers below the ancient, crater-scarred southern highlands.',
    xpReward: 175,
  },
  {
    id: 'geo_lava_tubes',
    category: 'Geology',
    question: 'Why are collapsed "skylight" pits on Mars’s flanks exciting to geologists and mission planners?',
    options: [
      'They mark entrances to giant underground lava tubes shielded from radiation',
      'They lead directly into Mars’s molten iron core',
      'They contain pressurized breathable nitrogen pockets',
      'They reflect radio signals back to Earth',
    ],
    correctIndex: 0,
    explanation:
      'Because of Mars’s low 38% gravity, underground lava tubes can grow several times wider than Earth’s—offering ready-made caves for future bases!',
    xpReward: 150,
  },
  {
    id: 'geo_sand_color',
    category: 'Geology',
    question: 'Underneath the bright orange surface dust, what rock type makes up most dark dunes on Mars?',
    options: [
      'White quartz beach sand',
      'Dark volcanic basalt sand',
      'Crushed limestone shells',
      'Metallic nickel nuggets',
    ],
    correctIndex: 1,
    explanation:
      'Just like Hawaii’s black-sand beaches, dark Martian sand dunes like Bagnold Dunes are rich in pulverized volcanic basalt, olivine, and pyroxene.',
    xpReward: 150,
  },
  // --- Expanded Atmosphere Questions ---
  {
    id: 'atmo_devils',
    category: 'Atmosphere',
    question: 'What beneficial side effect do swirling Martian dust devils sometimes have on solar-powered rovers?',
    options: [
      'They recharge rover batteries via static lightning',
      'They sweep accumulated red dust off solar panels, restoring power output',
      'They push rovers effortlessly up steep crater walls',
      'They melt subsurface permafrost for wheel traction',
    ],
    correctIndex: 1,
    explanation:
      'Both Spirit and Opportunity enjoyed unexpected "cleaning events" when passing dust devils blew thick dust layers off their solar arrays!',
    xpReward: 125,
  },
  {
    id: 'atmo_clouds',
    category: 'Atmosphere',
    question: 'What are the wispy, iridescent high-altitude "twilight clouds" photographed by Curiosity on Mars made of?',
    options: [
      'Liquid sulfuric acid droplets',
      'Tiny water-ice and frozen CO2 dry-ice crystals',
      'Ammonia vapor plumes',
      'Pure evaporated iron',
    ],
    correctIndex: 1,
    explanation:
      'Cold high-altitude clouds over 60 km up crystallize CO2 dry ice, shimmering mother-of-pearl colors just after sunset.',
    xpReward: 150,
  },
  {
    id: 'atmo_escape',
    category: 'Atmosphere',
    question: 'According to NASA’s MAVEN orbiter, what stripped away most of Mars’s thick ancient atmosphere?',
    options: [
      'Plant photosynthesis consuming CO2',
      'Solar wind and ultraviolet radiation sputtering gas into space after the magnetic field faded',
      'Phobos pulling air off by tidal gravity',
      'Volcanic eruptions sucking air underground',
    ],
    correctIndex: 1,
    explanation:
      'Once Mars’s core cooled and its protective magnetic shield collapsed ~4 billion years ago, charged solar wind gradually eroded the upper atmosphere.',
    xpReward: 150,
  },
  {
    id: 'atmo_wind_force',
    category: 'Atmosphere',
    question: 'Why couldn’t a 100 km/h Martian windstorm actually topple a heavy rocket or astronaut like in sci-fi movies?',
    options: [
      'Martian dust stops wind below waist height',
      'Because Mars’s air is ~1% as dense as Earth’s, a 100 km/h gust pushes with the force of a gentle ~10 km/h Earth breeze',
      'High Martian gravity anchors everything to bedrock',
      'CO2 gas creates zero aerodynamic drag',
    ],
    correctIndex: 1,
    explanation:
      'Wind force scales with air density! Even fast Martian storm winds pack very little kinetic push compared to hurricanes on Earth.',
    xpReward: 175,
  },
  // --- Expanded Missions Questions ---
  {
    id: 'mis_sojourner',
    category: 'Missions',
    question: 'Which microwave-oven-sized rover became the first wheeled vehicle ever to drive on Mars in 1997?',
    options: [
      'Spirit',
      'Sojourner (aboard Mars Pathfinder)',
      'Lunokhod 1',
      'Opportunity',
    ],
    correctIndex: 1,
    explanation:
      'Deployed by Mars Pathfinder’s airbag bounce landing in Ares Vallis, Sojourner operated for 83 Sols instead of its planned 7 days!',
    xpReward: 125,
  },
  {
    id: 'mis_oppy_marathon',
    category: 'Missions',
    question: 'Approximately how long did the solar-powered Opportunity rover survive on Mars despite a 90-Sol design life?',
    options: [
      'About 6 months',
      'Nearly 15 years (over 5,100 Sols) and a full marathon distance of 45.16 km',
      'Exactly 2 Earth years',
      '400 Sols before running out of fuel',
    ],
    correctIndex: 1,
    explanation:
      'Opportunity landed in 2004 and explored Meridiani Planum and Endeavour Crater until a planet-wide dust storm silenced it in 2018!',
    xpReward: 125,
  },
  {
    id: 'mis_insight',
    category: 'Missions',
    question: 'What internal secrets did NASA’s stationary InSight lander uncover by listening to over 1,300 "marsquakes"?',
    options: [
      'Mars is completely hollow inside',
      'Mars has a crust, rocky mantle, and a smaller, denser liquid iron-alloy core rich in lighter elements',
      'Giant tectonic plates slide 50 cm per day',
      'Underground magma oceans erupt hourly',
    ],
    correctIndex: 1,
    explanation:
      'InSight’s ultra-sensitive seismometer detected seismic waves bouncing off Mars’s core, measuring its radius at ~1,650–1,830 km.',
    xpReward: 175,
  },
  {
    id: 'mis_zhurong',
    category: 'Missions',
    question: 'Which nation joined the U.S. in successfully operating a rover (Zhurong) on the Martian surface in 2021?',
    options: [
      'India (ISRO)',
      'China (CNSA, aboard Tianwen-1)',
      'Japan (JAXA)',
      'European Space Agency (ESA)',
    ],
    correctIndex: 1,
    explanation:
      'Tianwen-1 placed an orbiter and lander into Utopia Planitia, where Zhurong used ground-penetrating radar to study buried subsurface layers.',
    xpReward: 150,
  },
  {
    id: 'mis_mro',
    category: 'Missions',
    question: 'How do Mars orbiters like MRO (Mars Reconnaissance Orbiter) assist surface rovers every single day?',
    options: [
      'They beam down microwave electricity to recharge batteries',
      'They act as high-speed data relays to Earth and snap high-res HiRISE terrain maps to guide safe driving routes',
      'They drop spare tires onto craters',
      'They steer rovers directly via optical lasers',
    ],
    correctIndex: 1,
    explanation:
      'Rovers send gigabytes of science photos up to passing orbiters, which relay them to Earth’s Deep Space Network at far higher speeds!',
    xpReward: 125,
  },
  // --- Expanded Moons & Orbit Questions ---
  {
    id: 'orb_sol',
    category: 'Moons & Orbit',
    question: 'How long is one Martian "Sol" (one full solar day from noon to noon on Mars)?',
    options: [
      '12 hours 15 minutes',
      '24 hours 39 minutes 35 seconds',
      '36 hours exactly',
      '48 hours 10 minutes',
    ],
    correctIndex: 1,
    explanation:
      'A Martian Sol is just 39 minutes longer than an Earth day—meaning rover teams on Earth shift their work clocks later every morning to live on Mars time!',
    xpReward: 100,
  },
  {
    id: 'orb_stickney',
    category: 'Moons & Orbit',
    question: 'What dramatic feature dominates the face of Phobos and nearly shattered the tiny moon?',
    options: [
      'A glowing liquid water geyser',
      'Stickney Crater, an impact basin roughly 9 km across on a moon only 22 km wide',
      'A ring of golden dust volcanoes',
      'A sunken canyon deeper than Valles Marineris',
    ],
    correctIndex: 1,
    explanation:
      'Stickney Crater spans over 40% of Phobos’s diameter, leaving dramatic stress fractures radiating across the potato-shaped moon.',
    xpReward: 150,
  },
  {
    id: 'orb_eccentric',
    category: 'Moons & Orbit',
    question: 'Why are southern Martian summers noticeably warmer and shorter than northern summers?',
    options: [
      'Deimos reflects extra sunlight only onto the south pole',
      'Mars has an elliptical (egg-shaped) orbit that brings it closest to the Sun (perihelion) during southern summer',
      'The southern ocean traps solar warmth',
      'Dust storms cool the northern hemisphere completely',
    ],
    correctIndex: 1,
    explanation:
      'Mars’s orbital eccentricity (~0.093) creates ~45% more solar intensity at perihelion than aphelion, driving intense southern summer dust storms.',
    xpReward: 175,
  },
  {
    id: 'orb_fate',
    category: 'Moons & Orbit',
    question: 'What is predicted to happen to Mars’s inner moon Phobos in about 30 to 50 million years?',
    options: [
      'It will escape outward to orbit Jupiter',
      'Tidal gravity will pull it inward until it breaks apart into a Martian planetary ring or crashes',
      'It will collide with Deimos next century',
      'Solar heating will evaporate it into steam',
    ],
    correctIndex: 1,
    explanation:
      'Because Phobos orbits below synchronous altitude, tidal forces slow it down so it spirals ~1.8 cm closer to Mars every year!',
    xpReward: 175,
  },
  // --- Expanded Human Survival Questions ---
  {
    id: 'surv_sabatier',
    category: 'Human Survival',
    question: 'How can astronauts use the Sabatier chemical reaction on Mars to make return rocket fuel?',
    options: [
      'Crushing iron oxide dust with nitrogen',
      'Combining Martian CO2 air with hydrogen (from water ice) to synthesize methane (CH4) and water',
      'Compressing sunlight inside mirrors',
      'Boiling dry ice inside rocket nozzles',
    ],
    correctIndex: 1,
    explanation:
      'In-Situ Resource Utilization (ISRU) pairs Sabatier reactors with electrolysis so Mars provides both methane fuel and liquid oxygen for rockets!',
    xpReward: 175,
  },
  {
    id: 'surv_launch_window',
    category: 'Human Survival',
    question: 'Roughly how often does an optimal Hohmann transfer launch window open for rockets traveling from Earth to Mars?',
    options: [
      'Every 30 days',
      'Every ~26 months (~780 Earth days)',
      'Once every 10 years',
      'Every single Tuesday',
    ],
    correctIndex: 1,
    explanation:
      'Earth laps Mars in its inner orbit about every 26 months, aligning both planets for a fuel-efficient 6-to-9-month interplanetary cruise.',
    xpReward: 125,
  },
  {
    id: 'surv_hydroponics',
    category: 'Human Survival',
    question: 'Why do Martian base greenhouses rely heavily on LED lighting and closed-loop hydroponics/aeroponics?',
    options: [
      'Mars receives only ~43% of Earth’s sunlight intensity, plus dust storms can dim skies for weeks',
      'LEDs freeze plants into stasis',
      'Martian sunlight has zero visible wavelengths',
      'Hydroponics requires zero electricity or pumps',
    ],
    correctIndex: 0,
    explanation:
      'Orbiting 1.5× farther from the Sun cuts solar intensity by more than half, so closed-loop misting and tuned pink/white LEDs maximize crop yields while recycling 98% of water.',
    xpReward: 150,
  },
  // --- Astrobiology & Ancient Water Category ---
  {
    id: 'bio_oceans',
    category: 'Astrobiology & Water',
    question: 'What compelling landscape clues suggest northern Mars once hosted vast rivers, deltas, and possibly an ocean?',
    options: [
      'Preserved fossil whale skeletons on Olympus Mons',
      'Branching valley networks, fan-shaped river deltas, rounded pebbles, and water-altered clay minerals',
      'Active coral reefs inside Gale Crater',
      'Continuous liquid rainfall every Martian spring',
    ],
    correctIndex: 1,
    explanation:
      'During the Noachian epoch (~3.8–4.1 billion years ago), Mars carved dendritic river valleys and deposited clay mudstones in crater lakes!',
    xpReward: 125,
  },
  {
    id: 'bio_subsurface_ice',
    category: 'Astrobiology & Water',
    question: 'Where is the majority of water on Mars locked up today?',
    options: [
      'As deep subterranean aquifers of boiling water',
      'As massive water-ice polar caps and widespread buried glacier sheets beneath dust layers',
      'Floating as dense tropical rainclouds',
      'Inside Martian tree roots',
    ],
    correctIndex: 1,
    explanation:
      'Orbital radar and exposed cliff scarps reveal thick sheets of nearly pure water ice just meters below mid-latitude soil—ideal for future water mining!',
    xpReward: 125,
  },
  {
    id: 'bio_methane',
    category: 'Astrobiology & Water',
    question: 'Why are astrobiologists fascinated by tiny seasonal whiffs of methane gas detected in Mars’s air?',
    options: [
      'Methane proves Mars has high oxygen levels',
      'Sunlight destroys Martian methane within centuries, so fresh sources (geological water-rock reactions or subsurface microbes) must replenish it',
      'Methane turns Martian sand bright blue',
      'Phobos leaks methane through solar flares',
    ],
    correctIndex: 1,
    explanation:
      'Because UV radiation breaks down methane relatively quickly, any active plumes hint at ongoing underground chemistry—either hydrothermal minerals or potential micro-life!',
    xpReward: 175,
  },
  {
    id: 'bio_organics',
    category: 'Astrobiology & Water',
    question: 'Did Curiosity and Perseverance actually find complex organic carbon molecules inside ancient Martian mudstones?',
    options: [
      'No—Mars has zero carbon molecules anywhere',
      'Yes—ancient mudstones in Gale and Jezero Craters preserve carbon-based organic building blocks',
      'Only plastic debris left by astronauts',
      'Yes—live flowering plants were excavated',
    ],
    correctIndex: 1,
    explanation:
      'Finding ancient organic molecules shows the chemical ingredients for life were preserved in Martian lakebeds—one big reason Mars Sample Return aims to study those rock cores in Earth labs!',
    xpReward: 150,
  },
  {
    id: 'bio_stromatolites',
    category: 'Astrobiology & Water',
    question: 'What kind of fossilized trace of ancient life are scientists searching for in Jezero Crater’s carbonate rim rocks?',
    options: [
      'Dinosaur footprints in volcanic ash',
      'Stromatolite-like layered microbial mats trapped in mineral sediments',
      'Deep-sea giant squid fossils',
      'Petrified redwood tree trunks',
    ],
    correctIndex: 1,
    explanation:
      'On early Earth, photosynthetic microbes built layered carbonate mats called stromatolites—exactly the kind of rock texture Perseverance inspects along Jezero’s ancient shoreline!',
    xpReward: 175,
  },
];

export function pickRandomTriviaQuestion(usedIds: Set<string>, excludeId?: string): TriviaQuestion {
  let pool = TRIVIA_EXPEDITION_QUESTIONS.filter((q) => !usedIds.has(q.id));
  if (pool.length === 0) {
    usedIds.clear();
    pool = TRIVIA_EXPEDITION_QUESTIONS.filter((q) => q.id !== excludeId);
    if (pool.length === 0) {
      pool = TRIVIA_EXPEDITION_QUESTIONS;
    }
  }
  const picked = pool[Math.floor(Math.random() * pool.length)];
  usedIds.add(picked.id);
  return picked;
}
