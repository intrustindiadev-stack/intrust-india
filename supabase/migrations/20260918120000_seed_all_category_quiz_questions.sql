-- Migration: Seed high quality trivia and challenge questions across all categories
-- Categories: mythology-culture, general-knowledge, business-brands, technology, sports, entertainment, food-lifestyle, enterprise

-- 1. GENERAL KNOWLEDGE
INSERT INTO public.daily_challenge_questions (category_id, question, options, correct_option_index, explanation)
SELECT c.id, q.question, q.options::jsonb, q.correct_option_index, q.explanation
FROM public.daily_challenge_categories c
CROSS JOIN (VALUES
    ('What is India''s official National Aquatic Animal?', '["Ganges River Dolphin", "Olive Ridley Turtle", "Gharial", "Golden Mahseer"]', 0, 'The Ganges River Dolphin (Platanista gangetica) was officially declared India''s National Aquatic Animal in 2009.'),
    ('Which city in Madhya Pradesh is globally acclaimed for the Great Buddhist Stupa built by Emperor Ashoka?', '["Ujjain", "Sanchi", "Khajuraho", "Mandu"]', 1, 'The Great Stupa at Sanchi in Raisen district, MP is a UNESCO World Heritage site dating back to the 3rd century BCE.'),
    ('Which pass connects the Kullu Valley with the Lahaul and Spiti Valleys in Himachal Pradesh?', '["Zoji La", "Nathu La", "Rohtang Pass", "Shipki La"]', 2, 'Rohtang Pass at an elevation of 3,978 m connects Kullu with Lahaul and Spiti valleys in Himachal Pradesh.'),
    ('Who was the first Chief Election Commissioner of Independent India?', '["Sukumar Sen", "T.N. Seshan", "K.V.K. Sundaram", "Dr. Nagendra Singh"]', 0, 'Sukumar Sen served as the first Chief Election Commissioner from 1950 to 1958, conducting India''s first two general elections.'),
    ('What do the 24 spokes of the Ashoka Chakra represent on the Indian National Flag?', '["24 States of ancient India", "24 Virtues / Continuous progressive movement", "24 Rulers of Maurya Dynasty", "24 Seasons of the Vedic Calendar"]', 1, 'The 24 spokes of the Dharma Chakra represent the 24 eternal virtues and ceaseless movement in righteousness.'),
    ('Which is the highest mountain peak situated entirely within Indian territory?', '["K2 (Godwin Austen)", "Kangchenjunga", "Nanda Devi", "Kamet"]', 2, 'Nanda Devi (7,816 m) in Uttarakhand is the highest peak located entirely within India''s sovereign borders.'),
    ('Who is revered as the Chief Architect of the Constitution of India?', '["Jawaharlal Nehru", "Dr. B.R. Ambedkar", "Dr. Rajendra Prasad", "Sardar Vallabhbhai Patel"]', 1, 'Dr. Bhimrao Ramji Ambedkar chaired the Drafting Committee of the Constituent Assembly.'),
    ('Which Indian state has the longest mainland coastline in India?', '["Maharashtra", "Tamil Nadu", "Gujarat", "Andhra Pradesh"]', 2, 'Gujarat has the longest mainland coastline in India spanning approximately 1,600 kilometers.'),
    ('What is the national motto of India inscribed below the National Emblem?', '["Satyameva Jayate", "Vande Mataram", "Jai Jawan Jai Kisan", "Vasudhaiva Kutumbakam"]', 0, 'Satyameva Jayate (''Truth alone triumphs'') is taken from the sacred Mundaka Upanishad.'),
    ('In which national park was Project Tiger first launched in India in 1973?', '["Kaziranga National Park", "Jim Corbett National Park", "Ranthambore National Park", "Kanha National Park"]', 1, 'Project Tiger was officially inaugurated at Jim Corbett National Park in Uttarakhand on April 1, 1973.')
) AS q(question, options, correct_option_index, explanation)
WHERE c.slug = 'general-knowledge';

-- 2. BUSINESS & BRANDS
INSERT INTO public.daily_challenge_questions (category_id, question, options, correct_option_index, explanation)
SELECT c.id, q.question, q.options::jsonb, q.correct_option_index, q.explanation
FROM public.daily_challenge_categories c
CROSS JOIN (VALUES
    ('Which pioneering conglomerate founded India''s first commercial airline in 1932?', '["Birla Group", "Tata Group", "Wadia Group", "Godrej Group"]', 1, 'J.R.D. Tata founded Tata Airlines in 1932, which later transformed into Air India.'),
    ('What does the revolutionary financial acronym UPI stand for in India?', '["Unified Payments Interface", "Universal Payment Integration", "United Payments Institution", "Uniform Pay Infrastructure"]', 0, 'UPI (Unified Payments Interface) was developed by the National Payments Corporation of India (NPCI) in 2016.'),
    ('Which beloved Indian dairy cooperative was founded in 1946 with the ''Taste of India'' tagline?', '["Mother Dairy", "Amul", "Nandini", "Vita"]', 1, 'Amul (Anand Milk Union Limited) was founded in Anand, Gujarat, sparking India''s White Revolution.'),
    ('Which Indian tech giant was co-founded by N.R. Narayana Murthy and six engineers in 1981?', '["Wipro", "TCS", "Infosys", "HCL Technologies"]', 2, 'Infosys was founded on July 2, 1981, with an initial capital of ₹10,000 borrowed by Narayana Murthy.'),
    ('Which historic biscuit brand, known for its yellow packaging, is one of the highest-selling biscuits worldwide?', '["Britannia Marie", "Parle-G", "Sunfeast Bounce", "Priya Gold"]', 1, 'Parle-G, launched in 1939 as Parle Gluco, has been recognized repeatedly as the world''s best-selling biscuit brand.'),
    ('Who made history as the first female Chairperson of the State Bank of India (SBI) in 2013?', '["Chanda Kochhar", "Arundhati Bhattacharya", "Shikha Sharma", "Naina Lal Kidwai"]', 1, 'Arundhati Bhattacharya made history in 2013 as the first woman to head India''s largest commercial lender, SBI.'),
    ('Which Indian e-commerce company was founded by Sachin Bansal and Binny Bansal in Bengaluru in 2007?', '["Snapdeal", "Flipkart", "Myntra", "ShopClues"]', 1, 'Flipkart began in 2007 as an online bookstore before expanding into India''s premier e-commerce marketplace.'),
    ('What is the central banking institution that controls the monetary policy and currency issuance in India?', '["State Bank of India", "Securities and Exchange Board of India", "Reserve Bank of India", "NITI Aayog"]', 2, 'The Reserve Bank of India (RBI) was established on April 1, 1935 under the Reserve Bank of India Act, 1934.'),
    ('Which Indian automotive manufacturer created the iconic ''Scorpio'' and ''Thar'' SUV platforms?', '["Tata Motors", "Mahindra & Mahindra", "Maruti Suzuki", "Force Motors"]', 1, 'Mahindra & Mahindra revolutionized the Indian rugged SUV market with the launch of the Scorpio in 2002.'),
    ('What was the first iconic instant noodles brand launched in India in 1983?', '["Top Ramen", "Maggi", "Yippee", "Wai Wai"]', 1, 'Nestlé launched Maggi 2-Minute Noodles in India in 1983, pioneering the Indian instant noodle category.')
) AS q(question, options, correct_option_index, explanation)
WHERE c.slug = 'business-brands';

-- 3. TECHNOLOGY
INSERT INTO public.daily_challenge_questions (category_id, question, options, correct_option_index, explanation)
SELECT c.id, q.question, q.options::jsonb, q.correct_option_index, q.explanation
FROM public.daily_challenge_categories c
CROSS JOIN (VALUES
    ('Which landmark space mission made India the first nation to soft-land near the Moon''s South Pole in 2023?', '["Mangalyaan-1", "Chandrayaan-2", "Chandrayaan-3", "Aditya-L1"]', 2, 'ISRO''s Chandrayaan-3 touched down near the lunar South Pole on August 23, 2023, now celebrated as National Space Day.'),
    ('What is India''s indigenous satellite navigation system equivalent to GPS called?', '["GAGAN", "NavIC", "BHUVAN", "ASTROSAT"]', 1, 'NavIC (Navigation with Indian Constellation), operated by ISRO, provides high-accuracy regional satellite positioning.'),
    ('Which electronic toll collection technology in India utilizes passive RFID stickers on vehicle windshields?', '["FASTag", "UPI Toll", "RFID Bharat", "QuickPass"]', 0, 'FASTag uses passive Radio Frequency Identification (RFID) technology linked directly to prepaid accounts or wallets.'),
    ('What is the name of India''s AI supercomputer installed at C-DAC Pune ranked among global top systems?', '["PARAM Shivay", "AIRAWAT", "Pratyush", "Mihir"]', 1, 'AIRAWAT (AI Research, Analytics and Knowledge Dissemination Platform) was ranked among the top global AI supercomputers in 2023.'),
    ('What is the world''s largest biometric digital identity platform implemented in India?', '["DigiLocker", "Aadhaar", "e-Pramaan", "Jan Dhan"]', 1, 'Aadhaar, managed by UIDAI, is a 12-digit unique identity number backed by biometric iris and fingerprint recognition.'),
    ('Which programming language created by Guido van Rossum is the global standard for AI and Data Science?', '["Java", "C++", "Python", "Rust"]', 2, 'Python''s clean syntax and extensive ecosystem (NumPy, PyTorch, TensorFlow) make it the predominant AI language.'),
    ('In telecommunications, what does the technology acronym ''VoLTE'' stand for?', '["Voice over Long-Term Evolution", "Variable optical Line Termination Entity", "Virtual operational Low Traffic Engine", "Verified online Long-range Transmission"]', 0, 'VoLTE (Voice over Long-Term Evolution) enables high-definition voice calling seamlessly over 4G LTE data channels.'),
    ('Which dedicated solar observatory was launched by ISRO in September 2023 to Lagrange Point 1?', '["Surya-1", "Aditya-L1", "Helios-Bharat", "Divya-Chakshu"]', 1, 'Aditya-L1 was placed in a halo orbit around the Sun-Earth L1 point, approximately 1.5 million km from Earth.'),
    ('Which decentralized digital ledger technology serves as the foundation for modern cryptocurrencies?', '["Quantum Key Distribution", "Blockchain", "Cloud Computing", "Mesh Networking"]', 1, 'Blockchain is an immutable, distributed, decentralized ledger for recording transactions cryptographically.'),
    ('Which platform allows Indian citizens to store and share authentic digital copies of licenses and degree certificates?', '["Umang", "DigiLocker", "MyGov", "BHIM"]', 1, 'DigiLocker provides secure cloud storage for verifiable electronic documents issued directly by authentic government authorities.')
) AS q(question, options, correct_option_index, explanation)
WHERE c.slug = 'technology';

-- 4. SPORTS
INSERT INTO public.daily_challenge_questions (category_id, question, options, correct_option_index, explanation)
SELECT c.id, q.question, q.options::jsonb, q.correct_option_index, q.explanation
FROM public.daily_challenge_categories c
CROSS JOIN (VALUES
    ('Who is the only cricketer in international history to score 100 international centuries?', '["Virat Kohli", "Sachin Tendulkar", "Ricky Ponting", "Brian Lara"]', 1, 'Sachin Tendulkar scored 51 Test centuries and 49 ODI centuries across an illustrious 24-year international career.'),
    ('In which year did the Indian Men''s Cricket Team win their historic first ICC World Cup under Kapil Dev?', '["1975", "1979", "1983", "1987"]', 2, 'India defeated the dominant West Indies at Lord''s Cricket Ground on June 25, 1983 to claim their first World Cup.'),
    ('Who won India''s first-ever Olympic track and field gold medal in Men''s Javelin Throw at Tokyo 2020?', '["Abhinav Bindra", "Neeraj Chopra", "Milkha Singh", "PT Usha"]', 1, 'Neeraj Chopra threw 87.58 m in Tokyo on August 7, 2021, winning India''s historic first athletics Olympic gold medal.'),
    ('How many Olympic Gold Medals has the Indian Men''s Field Hockey Team won in Olympic history?', '["6", "8", "10", "12"]', 1, 'India has won 8 Olympic Gold medals in field hockey (1928, 1932, 1936, 1948, 1952, 1956, 1964, and 1980).'),
    ('Which Indian chess prodigy became the youngest-ever challenger to the World Chess Championship in 2024?', '["R Praggnanandhaa", "D Gukesh", "Viswanathan Anand", "Arjun Erigaisi"]', 1, 'At just 17 years old, D Gukesh won the FIDE Candidates Tournament 2024 in Toronto to become the youngest world championship challenger.'),
    ('Who was the first Indian woman to win an Olympic medal in badminton at London 2012?', '["PV Sindhu", "Saina Nehwal", "Jwala Gutta", "Ashwini Ponnappa"]', 1, 'Saina Nehwal won the bronze medal in Women''s Singles Badminton at the London 2012 Olympic Games.'),
    ('In the sport of Kabaddi, what is the maximum time in seconds permitted for a single raid?', '["20 seconds", "30 seconds", "40 seconds", "45 seconds"]', 1, 'According to standard international and Pro Kabaddi League rules, each raid is limited to a maximum of 30 seconds.'),
    ('Which Indian woman boxer won an unprecedented six World Amateur Boxing Championship gold medals?', '["Mary Kom", "Lovlina Borgohain", "Nikhat Zareen", "Sarita Devi"]', 0, 'MC Mary Kom, nicknamed ''Magnificent Mary'', achieved the world record by winning six world amateur boxing championship titles.'),
    ('Which franchise won the inaugural edition of the Indian Premier League (IPL) in 2008 under Shane Warne?', '["Chennai Super Kings", "Rajasthan Royals", "Mumbai Indians", "Kolkata Knight Riders"]', 1, 'Rajasthan Royals defeated Chennai Super Kings in a thrilling last-ball finish in DY Patil Stadium in June 2008.'),
    ('Which legendary Indian track sprinter was globally known as ''The Flying Sikh''?', '["Milkha Singh", "Gurbachan Singh Randhawa", "Pargat Singh", "Dhyan Chand"]', 0, 'Milkha Singh was bestowed the title ''The Flying Sikh'' by Pakistan''s President Ayub Khan following his triumph in Lahore in 1960.')
) AS q(question, options, correct_option_index, explanation)
WHERE c.slug = 'sports';

-- 5. ENTERTAINMENT
INSERT INTO public.daily_challenge_questions (category_id, question, options, correct_option_index, explanation)
SELECT c.id, q.question, q.options::jsonb, q.correct_option_index, q.explanation
FROM public.daily_challenge_categories c
CROSS JOIN (VALUES
    ('Which song from the movie RRR won the Academy Award (Oscar) for Best Original Song in 2023?', '["Jai Ho", "Naatu Naatu", "Chaiyya Chaiyya", "Kesariya"]', 1, '''Naatu Naatu'', composed by M.M. Keeravani with lyrics by Chandrabose, made history as the first Indian film song to win an Oscar.'),
    ('Who directed the landmark Indian masterpiece ''Pather Panchali'' (1955), gaining global international renown?', '["Guru Dutt", "Satyajit Ray", "Ritwik Ghatak", "Mrinal Sen"]', 1, 'Satyajit Ray''s directorial debut ''Pather Panchali'' won the Best Human Document award at the Cannes Film Festival in 1956.'),
    ('What is the highest award in Indian cinema presented annually by the Government of India?', '["Filmfare Lifetime Award", "Dadasaheb Phalke Award", "National Film Laurel", "Sangeet Natak Akademi Award"]', 1, 'The Dadasaheb Phalke Award, instituted in 1969, honors lifetime contributions to the development of Indian cinema.'),
    ('Which longest-running television quiz show in India has been hosted by Amitabh Bachchan since 2000?', '["Kaun Banega Crorepati", "Dus Ka Dum", "Kamzor Kadii Kaun", "Kya Aap Paanchvi Pass Se Tez Hain?"]', 0, 'Kaun Banega Crorepati (KBC), adapted from Who Wants to Be a Millionaire?, debuted in July 2000 and transformed Indian television.'),
    ('What was the title of the first full-length Indian feature film released in 1913?', '["Alam Ara", "Raja Harishchandra", "Kisan Kanya", "Ayodhyecha Raja"]', 1, 'Dadasaheb Phalke produced and directed the silent film ''Raja Harishchandra'', released on May 3, 1913.'),
    ('Which was the first Indian sound film (talkie) released in 1931, introducing dialogue and song?', '["Raja Harishchandra", "Alam Ara", "Achhut Kanya", "Chandidas"]', 1, 'Ardeshir Irani directed ''Alam Ara'', which premiered at the Majestic Cinema in Mumbai on March 14, 1931.'),
    ('Who is celebrated globally as the ''Mozart of Madras'' for his iconic fusion of classical and contemporary world music?', '["Ilaiyaraaja", "A.R. Rahman", "R.D. Burman", "M.M. Keeravani"]', 1, 'A.R. Rahman won two Academy Awards, two Grammy Awards, and a BAFTA for his ground-breaking compositions.'),
    ('Which classical Indian dance form from Kerala is known for its vibrant makeup (Vesham) and heroic drama?', '["Bharatanatyam", "Kathakali", "Kathak", "Odissi"]', 1, 'Kathakali is renowned for its stylized makeup, elaborate headgear, hand gestures (mudras), and expressive facial acting.'),
    ('Who directed the monumental pan-Indian blockbuster franchise ''Baahubali''?', '["Prashanth Neel", "S.S. Rajamouli", "Sukumar", "Shankar"]', 1, 'S.S. Rajamouli created Baahubali: The Beginning (2015) and Baahubali 2 (2017), redefining scale in Indian cinema.'),
    ('Which classical Indian string instrument is synonymous with the maestro Pandit Ravi Shankar?', '["Sarod", "Sitar", "Veena", "Santoor"]', 1, 'Pandit Ravi Shankar was an internationally renowned sitar virtuoso who popularized Indian classical ragas across the globe.')
) AS q(question, options, correct_option_index, explanation)
WHERE c.slug = 'entertainment';

-- 6. FOOD & LIFESTYLE
INSERT INTO public.daily_challenge_questions (category_id, question, options, correct_option_index, explanation)
SELECT c.id, q.question, q.options::jsonb, q.correct_option_index, q.explanation
FROM public.daily_challenge_categories c
CROSS JOIN (VALUES
    ('Which Indian spice, historically termed ''Black Gold'', was traded globally from the Malabar Coast?', '["Cardamom", "Black Pepper", "Clove", "Cinnamon"]', 1, 'Black pepper from Kerala''s Malabar Coast drove ancient international spice maritime routes connecting India to Rome and Arabia.'),
    ('Which Indian state produces over 50% of the country''s tea along the fertile Brahmaputra valley?', '["Assam", "Kerala", "Himachal Pradesh", "Tamil Nadu"]', 0, 'Assam produces over half of India''s tea, renowned worldwide for its rich body, bright color, and malty flavor.'),
    ('Which long-grain fragrant rice with protected Geographical Indication (GI) originates in the Himalayan foothills?', '["Sona Masoori", "Basmati Rice", "Gobindobhog", "Jeera Samba"]', 1, 'Basmati, meaning ''fragrant'' in Sanskrit, is cultivated predominantly in the Indo-Gangetic plains of North India.'),
    ('What is the traditional fermented south Indian steamed breakfast dish made from rice and urad dal batter?', '["Poha", "Idli", "Dhokla", "Upma"]', 1, 'Idlis are nutrient-rich, easily digestible fermented steamed cakes beloved across India and worldwide.'),
    ('Which golden spice contains the active therapeutic compound ''Curcumin'', praised in Ayurveda?', '["Ginger", "Turmeric (Haldi)", "Saffron (Kesar)", "Fenugreek (Methi)"]', 1, 'Turmeric contains curcumin, an effective natural antioxidant and anti-inflammatory compound used in traditional wellness.'),
    ('What is the traditional cooling buttermilk beverage seasoned with roasted cumin and mint in India?', '["Chaas", "Aam Panna", "Kahwa", "Thandai"]', 0, 'Chaas is a refreshing probiotic beverage seasoned with roasted cumin, rock salt, and mint leaves.'),
    ('Which Indian city is internationally celebrated for its GI-tagged authentic ''Dum'' style Biryani?', '["Lucknow", "Hyderabad", "Kolkata", "Bhopal"]', 1, 'Hyderabadi Dum Biryani combines basmati rice and marinated spices sealed with dough in a heavy-bottom handi over slow coals.'),
    ('Which town in Jammu & Kashmir is famous as the ''Saffron Capital of India'' for cultivating prized saffron?', '["Pampore", "Gulmarg", "Pahalgam", "Sonamarg"]', 0, 'Pampore, situated on the banks of the Jhelum river, produces GI-tagged Kashmir saffron renowned for its deep crimson stigma.'),
    ('What is the royal Rajasthani dish consisting of baked wheat rolls, spicy lentils, and sweet cereal?', '["Makki di Roti & Sarson Saag", "Dal Baati Churma", "Litti Chokha", "Thepla & Chhundo"]', 1, 'Dal Baati Churma is a signature Rajasthani dish served with generous portions of pure desi cow ghee.'),
    ('In Ayurveda, which three medicinal fruits combine to form the renowned balancing formula ''Triphala''?', '["Amalaki, Bibhitaki, Haritaki", "Tulsi, Neem, Giloy", "Ashwagandha, Shatavari, Brahmi", "Ginger, Black Pepper, Pippali"]', 0, 'Triphala (''three fruits'') comprises Amla, Bibhitaki, and Haritaki, revered for digestion and rejuvenation.')
) AS q(question, options, correct_option_index, explanation)
WHERE c.slug = 'food-lifestyle';

-- 7. ENTERPRISE & INDUSTRY
INSERT INTO public.daily_challenge_questions (category_id, question, options, correct_option_index, explanation)
SELECT c.id, q.question, q.options::jsonb, q.correct_option_index, q.explanation
FROM public.daily_challenge_categories c
CROSS JOIN (VALUES
    ('What does the economic abbreviation ''MSME'' stand for in Indian industrial development?', '["Micro, Small and Medium Enterprises", "Modern System of Manufacturing Entities", "Macro State Merchant Enterprises", "Mega Scale Machinery Exporters"]', 0, 'MSMEs contribute over 30% of India''s GDP and generate approximately 45% of India''s overall exports.'),
    ('Which unified indirect tax system was implemented in India on July 1, 2017 to replace multiple state taxes?', '["Value Added Tax (VAT)", "Goods and Services Tax (GST)", "Central Excise Duty", "Service Tax"]', 1, 'GST was introduced under ''One Nation, One Tax'', streamlining the multi-tier indirect tax framework in India.'),
    ('Which city in Gujarat is renowned as the global diamond hub, cutting and polishing 90% of the world''s diamonds?', '["Ahmedabad", "Surat", "Vadodara", "Rajkot"]', 1, 'Surat is home to the world''s largest office complex (Surat Diamond Bourse) and processes 9 out of 10 rough diamonds globally.'),
    ('Which southern metropolis is widely recognized as the ''Automobile Capital of India''?', '["Bengaluru", "Chennai", "Hyderabad", "Kochi"]', 1, 'Chennai hosts extensive vehicle and component manufacturing clusters for major global auto giants.'),
    ('What flagship national program was launched in September 2014 to boost domestic manufacturing investment?', '["Startup India", "Make in India", "Digital India", "Stand Up India"]', 1, '''Make in India'' was initiated to facilitate investment, foster innovation, and build world-class manufacturing infrastructure.'),
    ('What mandatory digital document is generated under GST for transport of goods valued above ₹50,000?', '["FastTrack Bill", "e-Way Bill", "GST Transit Pass", "Vahan Pass"]', 1, 'An e-Way Bill is an electronically generated tracking slip required under the GST regime for the physical movement of consignments.'),
    ('Which mega port in Gujarat is India''s largest commercial private port and multi-product special economic zone?', '["Jawaharlal Nehru Port (JNPT)", "Mundra Port", "Kandla Port", "Cochin Port"]', 1, 'Mundra Port handles over 150 million metric tons of cargo annually with state-of-the-art deep draft berths.'),
    ('Which open-source protocol initiative aims to democratize e-commerce for small retailers across India?', '["ONDC (Open Network for Digital Commerce)", "GeM Portal", "FASTag", "e-NAM"]', 0, 'ONDC enables local corner shops and merchants to participate in digital commerce without platform exclusivity or lock-in.'),
    ('What capacity of non-fossil renewable energy has India targeted to install by 2030?', '["100 GW", "250 GW", "500 GW", "1000 GW"]', 2, 'India has set a national target of achieving 500 GW of non-fossil fuel electricity generation capacity by the year 2030.'),
    ('Which sector is the largest employer in India, providing livelihood to nearly 45% of the workforce?', '["IT & Software", "Agriculture & Allied Activities", "Automobile Manufacturing", "Textile & Apparel"]', 1, 'Agriculture and allied sectors continue to be the primary source of livelihood for approximately 45% of India''s population.')
) AS q(question, options, correct_option_index, explanation)
WHERE c.slug = 'enterprise';

-- 8. MYTHOLOGY & CULTURE (ADDITIONAL QUESTIONS)
INSERT INTO public.daily_challenge_questions (category_id, question, options, correct_option_index, explanation)
SELECT c.id, q.question, q.options::jsonb, q.correct_option_index, q.explanation
FROM public.daily_challenge_categories c
CROSS JOIN (VALUES
    ('Which sacred herb was brought by Lord Hanuman from the Himalayas to revive Lakshmana?', '["Brahmi", "Sanjeevani", "Tulsi", "Ashwagandha"]', 1, 'Lord Hanuman brought the entire Dronagiri mountain bearing the divine Sanjeevani herb to revive Lakshmana in Lanka.'),
    ('Who was the celestial architect who designed the mythical city of Indraprastha for the Pandavas?', '["Vishwakarma", "Maya Danava", "Kubera", "Brihaspati"]', 1, 'Maya Danava built the magnificent palace of illusions (Mayasabha) in Indraprastha for King Yudhishthira.'),
    ('Which indestructible celestial armour and earrings did Karna surrender to Lord Indra in disguise?', '["Kavacha and Kundala", "Pinaka and Gandiva", "Sudharshana and Kaumodaki", "Brahmashira"]', 0, 'Karna generously sliced off his natural divine armour (Kavacha) and earrings (Kundala) to Indra disguised as a Brahmin.'),
    ('In the Bhagavad Gita, on which sacred battlefield did Sri Krishna impart the eternal wisdom to Arjuna?', '["Hastinapur", "Kurukshetra", "Panipat", "Magadha"]', 1, 'The Bhagavad Gita consists of 700 verses spoken on the battlefield of Kurukshetra before the great war commenced.'),
    ('Which divine serpent was used as the rope to churn the cosmic ocean during the Samudra Manthan?', '["Shesha", "Vasuki", "Takshaka", "Kaliya"]', 1, 'The king of serpents, Vasuki, served willingly as the churning rope wrapped around Mount Mandara during Samudra Manthan.')
) AS q(question, options, correct_option_index, explanation)
WHERE c.slug = 'mythology-culture';
