import os
import json
import random
import sys
# Python 3.14 compatibility hack for google-generativeai protobuf C extension check
sys.modules['google._upb._message'] = None

from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
gemini_initialized = False

# Try to import and configure Gemini
if GEMINI_API_KEY and "YOUR_GEMINI" not in GEMINI_API_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_initialized = True
        print("StudySync AI: Connected to Gemini API successfully.")
    except Exception as e:
        print(f"StudySync AI: Failed to initialize Gemini API ({e}). Falling back to local demo templates.")
else:
    print("StudySync AI: Gemini API key missing. Running in local demo mode.")

def generate_dynamic_fallback(subject, topic):
    subject = (subject or "General Study").strip()
    topic = (topic or "Core Principles").strip()
    
    subj_lower = subject.lower()
    topic_lower = topic.lower()
    
    # 1. CHEMISTRY
    if "chem" in subj_lower:
        if "bond" in topic_lower:
            return {
                "title": f"Chemistry: Chemical Bonding",
                "summary": "Chemical bonding refers to the attraction between atoms, ions or molecules that enables the formation of chemical compounds. The strength of chemical bonds varies considerably; there are 'strong bonds' or 'covalent bonds' and 'weak bonds' such as dipole-dipole interactions, the London dispersion force and hydrogen bonding.",
                "key_points": [
                    "Covalent Bonding involves the sharing of electron pairs between atoms, typically non-metals.",
                    "Ionic Bonding is the electrostatic attraction between oppositely charged ions, formed by electron transfer.",
                    "Metallic Bonding features a 'sea of electrons' shared among a lattice of positively charged metal ions.",
                    "Electronegativity differences determine the polar or non-polar character of a covalent bond.",
                    "Octet Rule states that atoms tend to coordinate to have 8 valence electrons for maximum stability."
                ],
                "revision_notes": "Remember: Covalent = sharing, Ionic = transfer. Hydrogen bonds are strong intermolecular forces but weaker than covalent/ionic intramolecular bonds."
            }
        elif "water" in topic_lower or "quality" in topic_lower:
            return {
                "title": f"Chemistry: Water Quality Analysis",
                "summary": "Water quality refers to the chemical, physical, and biological characteristics of water, usually with respect to its suitability for a particular purpose like drinking. Key indicators include pH levels, dissolved oxygen content, turbidity, and the concentration of chemical dissolved solids or contaminants.",
                "key_points": [
                    "pH Scale measures acidity/alkalinity: neutral water has a pH close to 7.",
                    "Dissolved Oxygen (DO) is vital for aquatic life; low levels indicate biological pollution.",
                    "Turbidity measures water cloudiness, affecting light penetration and aquatic photosynthesis.",
                    "Chemical contaminants include heavy metals (lead, mercury) and agricultural runoff (nitrates, phosphates).",
                    "Water treatment processes involve coagulation, sedimentation, filtration, and disinfection (chlorination)."
                ],
                "revision_notes": "High nitrates/phosphates lead to eutrophication. Always verify pH levels and hardness indicators when reviewing water quality parameters."
            }
        else:
            return {
                "title": f"Chemistry - {topic}",
                "summary": f"This study module covers the core chemical principles of {topic}. It analyzes the molecular structures, reaction pathways, and experimental methodologies associated with this area of chemistry, focusing on thermodynamic stability and kinetic rates.",
                "key_points": [
                    f"Molecular interactions are fundamental to understanding the behavior of {topic}.",
                    f"Reaction rates and equilibria define the chemical transformations in {topic}.",
                    f"Stoichiometric ratios determine the quantitative relationships of elements involved.",
                    "Energy conservation applies to all exothermic and endothermic processes in this chemical system.",
                    "Experimental data validation is key to verifying compound composition and structural characteristics."
                ],
                "revision_notes": f"Revise key balancing equations and molecular weight conversions relevant to {topic}. Practice drawing Lewis structures."
            }

    # 2. PHYSICS
    elif "phys" in subj_lower:
        if "thermo" in topic_lower:
            return {
                "title": "Physics: Laws of Thermodynamics",
                "summary": "Thermodynamics is the branch of physics that deals with heat, work, and temperature, and their relation to energy, radiation, and physical properties of matter. The behavior of these quantities is governed by the four laws of thermodynamics which convey a quantitative description.",
                "key_points": [
                    "Zeroth Law defines thermal equilibrium and forms the basis for measuring temperature.",
                    "First Law (Conservation of Energy) states that heat added is work done plus internal energy increase.",
                    "Second Law states that entropy of an isolated system always increases over time.",
                    "Third Law asserts that a system's entropy approaches a constant value as temperature reaches absolute zero.",
                    "Heat engines convert thermal energy into mechanical work, limited by Carnot efficiency."
                ],
                "revision_notes": "Entropy is a measure of molecular disorder. Remember: Energy cannot be created or destroyed, only transformed."
            }
        else:
            return {
                "title": f"Physics - {topic}",
                "summary": f"This study guide reviews the physical laws and mathematical frameworks of {topic}. It explores forces, fields, and energy transformations, validating concepts with classical and modern physics paradigms.",
                "key_points": [
                    f"Fundamental equations govern the kinematics and dynamics of {topic}.",
                    f"Energy conservation principles apply to all closed physical systems involving {topic}.",
                    f"Forces and field interactions dictate the spatial movement and state of particles.",
                    "Dimensional consistency must be maintained across all derived mathematical models.",
                    "Experimental error analysis is critical for confirming physical constants and ratios."
                ],
                "revision_notes": f"Review key physical constants and check SI unit derivations for all variables in {topic}."
            }

    # 3. BIOLOGY
    elif "biol" in subj_lower:
        return {
            "title": f"Biology - {topic}",
            "summary": f"This biology summary explores the biological mechanisms, cellular processes, and ecological systems related to {topic}. It outlines the structures and functions that sustain living organisms.",
            "key_points": [
                f"Cellular processes provide the energy and building blocks required for {topic}.",
                f"Genetic structures inherit and express information defining the traits in {topic}.",
                f"Evolutionary adaptation drives diversity and functional shifts in biological systems.",
                "Homeostasis maintains stable internal conditions despite external changes.",
                "Ecological interdependencies link organisms to energy flows and nutrient cycles."
            ],
            "revision_notes": f"Focus on drawing anatomical pathways and labeling structures accurately when studying {topic}."
        }

    # 4. MATH
    elif "math" in subj_lower or "calc" in subj_lower:
        return {
            "title": f"Mathematics - {topic}",
            "summary": f"This math reference guide summarizes the formulas, proofs, and analytical techniques used to solve problems in {topic}. It details numerical methods and algebraic structures.",
            "key_points": [
                f"Fundamental theorems establish the logical foundation for calculating {topic}.",
                f"Step-by-step algebraic manipulation is required to solve equations in {topic}.",
                "Geometric representations offer visual intuition for abstract numerical values.",
                "Boundary conditions determine unique solutions to differential and linear systems.",
                "Proof structures verify the universal truth of mathematical conjectures."
            ],
            "revision_notes": f"Practice solving sample exercises and verify your answers using algebraic checks. Double check sign changes."
        }

    # 5. GENERAL / OTHER DYNAMIC FALLBACK
    else:
        return {
            "title": f"{subject} - {topic}",
            "summary": f"This study module covers the core concepts and essential frameworks of {topic} within the subject of {subject}. It reviews foundational definitions, research findings, and structural methods to help you grasp the material.",
            "key_points": [
                f"Core Concept: Grasping the foundational principles of {topic} is vital for this course.",
                f"Methodology: Understanding the key processes and analytical frameworks of {topic} is essential.",
                f"Terminology: Focus on defining critical terms and equations associated with {subject}.",
                "Practical Applications: Learn how these concepts are applied to real-world contexts and case studies.",
                "Critical Analysis: Evaluate different theories, structures, and assumptions in this space."
            ],
            "revision_notes": f"Focus on the primary definitions, theories, and models of {topic}. Practice summarizing concepts in your own words."
        }

def generate_dynamic_quiz_fallback(subject, topic):
    subject = (subject or "General Study").strip()
    topic = (topic or "Core Principles").strip()
    
    subj_lower = subject.lower()
    topic_lower = topic.lower()
    
    # 1. CHEMISTRY
    if "chem" in subj_lower:
        if "bond" in topic_lower:
            return {
                "quiz": [
                    {
                        "question": "Which of the following bonds involves the sharing of electron pairs between atoms?",
                        "options": ["Ionic bond", "Covalent bond", "Hydrogen bond", "Metallic bond"],
                        "correct_idx": 1,
                        "feedback": "Covalent bonding involves sharing electrons between non-metallic atoms to achieve stability."
                    },
                    {
                        "question": "What is the electrostatic attraction between oppositely charged ions called?",
                        "options": ["Covalent bond", "Metallic bond", "Ionic bond", "London dispersion force"],
                        "correct_idx": 2,
                        "feedback": "Ionic bonding occurs when electrons are transferred from a metal to a non-metal, forming ions."
                    },
                    {
                        "question": "Which rule states that atoms coordinate to have 8 valence electrons?",
                        "options": ["Hund's Rule", "Octet Rule", "Pauli Exclusion Principle", "Aufbau Principle"],
                        "correct_idx": 1,
                        "feedback": "The octet rule states that atoms lose, gain, or share electrons to acquire a full set of 8 valence electrons."
                    },
                    {
                        "question": "Which of the following is the strongest intramolecular chemical bond?",
                        "options": ["Hydrogen bond", "Covalent bond", "Van der Waals force", "Dipole-dipole force"],
                        "correct_idx": 1,
                        "feedback": "Covalent bonds are strong intramolecular chemical bonds, much stronger than intermolecular forces."
                    },
                    {
                        "question": "What kind of bond features a shared 'sea of electrons'?",
                        "options": ["Metallic bond", "Covalent bond", "Ionic bond", "Hydrogen bond"],
                        "correct_idx": 0,
                        "feedback": "Metallic bonding consists of a lattice of positive metal ions surrounded by a mobile sea of delocalized electrons."
                    }
                ]
            }
        elif "water" in topic_lower or "quality" in topic_lower:
            return {
                "quiz": [
                    {
                        "question": "What pH value represents neutral water?",
                        "options": ["pH 1", "pH 7", "pH 14", "pH 5"],
                        "correct_idx": 1,
                        "feedback": "A pH of 7 is considered neutral. Values below 7 are acidic, and values above 7 are alkaline."
                    },
                    {
                        "question": "Which indicator measures the cloudiness or haziness of water?",
                        "options": ["Dissolved Oxygen", "Turbidity", "Salinity", "Hardness"],
                        "correct_idx": 1,
                        "feedback": "Turbidity is the measure of relative clarity of a liquid, caused by suspended particles."
                    },
                    {
                        "question": "What environmental problem is caused by excess nitrates and phosphates in water?",
                        "options": ["Eutrophication", "Acidification", "Thermal pollution", "Desalination"],
                        "correct_idx": 0,
                        "feedback": "Excess nutrients lead to rapid algae growth (eutrophication), depleting oxygen levels."
                    },
                    {
                        "question": "Which of the following is a heavy metal water contaminant?",
                        "options": ["Sodium", "Chlorine", "Lead", "Nitrate"],
                        "correct_idx": 2,
                        "feedback": "Lead is a toxic heavy metal that can contaminate drinking water through old pipes."
                    },
                    {
                        "question": "What is the primary purpose of chlorination in water treatment?",
                        "options": ["Removing turbidity", "Softening hard water", "Disinfection of pathogens", "Neutralizing pH"],
                        "correct_idx": 2,
                        "feedback": "Chlorination is used to kill harmful bacteria, viruses, and pathogens in water."
                    }
                ]
            }
            
    # 2. PHYSICS
    if "phys" in subj_lower:
        if "thermo" in topic_lower:
            return {
                "quiz": [
                    {
                        "question": "Which law of thermodynamics is equivalent to the conservation of energy?",
                        "options": ["Zeroth Law", "First Law", "Second Law", "Third Law"],
                        "correct_idx": 1,
                        "feedback": "The First Law states that heat energy added to a system equals the work done plus internal energy change."
                    },
                    {
                        "question": "Which thermodynamics law introduces the concept of entropy?",
                        "options": ["Zeroth Law", "First Law", "Second Law", "Third Law"],
                        "correct_idx": 2,
                        "feedback": "The Second Law states that the total entropy of an isolated system always increases over time."
                    },
                    {
                        "question": "What is the theoretical maximum efficiency limit of a heat engine?",
                        "options": ["Carnot Efficiency", "Otto Efficiency", "Diesel Efficiency", "100% Efficiency"],
                        "correct_idx": 0,
                        "feedback": "The Carnot cycle defines the absolute thermodynamic limit of heat engine efficiency."
                    },
                    {
                        "question": "What happens to system entropy as temperature approaches absolute zero?",
                        "options": ["Approaches infinity", "Approaches a constant minimum", "Fluctuates randomly", "Becomes negative"],
                        "correct_idx": 1,
                        "feedback": "The Third Law states that a system's entropy approaches a constant minimum value as temperature reaches absolute zero."
                    },
                    {
                        "question": "Which law forms the logical basis for defining temperature scales?",
                        "options": ["Zeroth Law", "First Law", "Second Law", "Third Law"],
                        "correct_idx": 0,
                        "feedback": "The Zeroth Law defines thermal equilibrium, which allows temperature measurement."
                    }
                ]
            }

    # General Dynamic Fallback Quiz
    return {
        "quiz": [
            {
                "question": f"What is the primary focus when analyzing the foundations of {topic}?",
                "options": ["Understanding core properties and rules", "Ignoring experimental variables", "Bypassing calculations", "Memorizing templates"],
                "correct_idx": 0,
                "feedback": f"Mastering {topic} requires first understanding its fundamental properties and laws."
            },
            {
                "question": f"In {subject}, what is a standard methodology to validate a hypothesis?",
                "options": ["Random guessing", "Structured experimentation and calculation", "Omitting control variables", "Relying on intuition alone"],
                "correct_idx": 1,
                "feedback": f"Scientific validity in {subject} is achieved through structured calculation and experiments."
            },
            {
                "question": f"Which of the following is considered a key variable in {topic}?",
                "options": ["System parameters and constants", "Unrelated external forces", "Subjective interpretations", "Writing speed"],
                "correct_idx": 0,
                "feedback": "System variables and constants dictate state changes."
            },
            {
                "question": f"Why is dimensional checking important in {subject}?",
                "options": ["Ensures units match on both sides of an equation", "Reduces printing paper size", "Allows skipping calculations", "Increases compiler speed"],
                "correct_idx": 0,
                "feedback": "Dimensional analysis checks equation consistency."
            },
            {
                "question": f"What is the most recommended study method for mastering {topic}?",
                "options": ["Practice exercises and conceptual mapping", "Rushing through textbooks", "Skipping quizzes", "Ignoring feedback"],
                "correct_idx": 0,
                "feedback": "Solving sample problems reinforces concepts and uncovers understanding gaps."
            }
        ]
    }

# --- PRELOADED DEMO DATA FOR OFFLINE / HACKATHON TESTING ---

DEMO_SUMMARIES = {
    "data structures": {
        "title": "Data Structures - Core Concepts",
        "summary": "Data Structures are specialized methods for organizing and storing data in a computer system so that operations can be performed efficiently. Linear structures, such as arrays and linked lists, represent elements sequential in memory, whereas non-linear structures, like trees and graphs, establish hierarchical relationships. Understanding time and space complexity using Big O notation is critical for choosing the right data structure for specific applications.",
        "key_points": [
            "Arrays provide O(1) random access but require contiguous memory and have a fixed size.",
            "Linked Lists offer dynamic sizing and O(1) insertions/deletions (at the head) but require traversal (O(n)) for accessing elements.",
            "Stacks follow Last-In-First-Out (LIFO), useful for expression evaluation and backtracking.",
            "Queues follow First-In-First-Out (FIFO), widely used in CPU scheduling and buffers.",
            "Binary Search Trees (BST) allow search, insertion, and deletion in O(log n) average time."
        ],
        "revision_notes": "When optimizing algorithms, check if a Hash Map can convert O(n^2) lookups to O(1) at the expense of space. Stacks are implemented implicitly by the recursion stack. Linked lists do not suffer from memory fragmentation but consume extra memory for pointers."
    },
    "dbms": {
        "title": "Database Management Systems & Normalization",
        "summary": "A Database Management System (DBMS) is software that manages, stores, and retrieves data from databases. Relational databases store data in tables (relations) with rows and columns, structured via primary and foreign keys. Normalization is a systematic approach to decomposing tables to eliminate data redundancy and anomalies (insertion, update, and deletion anomalies) while preserving database integrity.",
        "key_points": [
            "ACID Properties guarantee reliable transactions: Atomicity, Consistency, Isolation, and Durability.",
            "First Normal Form (1NF) requires atomic values and no repeating groups.",
            "Second Normal Form (2NF) requires being in 1NF and having no partial dependencies (every non-prime attribute must depend on the whole primary key).",
            "Third Normal Form (3NF) requires being in 2NF and having no transitive dependencies.",
            "SQL Joins (Inner, Left, Right, Full) allow retrieval of data combined from multiple tables based on related columns."
        ],
        "revision_notes": "Isolation levels in transactions prevent concurrency phenomena like Dirty Reads, Non-repeatable Reads, and Phantom Reads. Indexes speed up SELECT queries but slow down INSERT/UPDATE statements due to index maintenance."
    },
    "operating systems": {
        "title": "Operating Systems - Process & Memory Management",
        "summary": "An Operating System (OS) acts as an intermediary between the user and computer hardware, managing hardware resources and process execution. It performs CPU scheduling to decide which process runs when, handles synchronization to prevent race conditions, and manages physical and virtual memory using paging and segmentation to ensure running programs have enough space without accessing other processes' boundaries.",
        "key_points": [
            "Processes represent programs in execution, while Threads are lightweight sub-units sharing the process's memory space.",
            "CPU Scheduling algorithms include First-Come-First-Serve (FCFS), Shortest Job First (SJF), and Round Robin (RR) for time-sharing.",
            "Deadlock occurs when processes are blocked waiting for resources held by each other. Conditions: Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait.",
            "Virtual Memory separates logical user memory from physical memory. Paging divides memory into fixed-size frames to prevent external fragmentation.",
            "Mutexes and Semaphores are synchronization primitives used to control access to shared critical sections."
        ],
        "revision_notes": "Thrashing occurs when a system spends more time paging (swapping pages in and out of disk) than executing actual instructions. Context switching adds CPU overhead but is necessary for multitasking."
    },
    "computer networks": {
        "title": "Computer Networks & The TCP/IP Suite",
        "summary": "Computer Networks allow nodes to share resources and communicate. The ISO OSI Model defines a 7-layer stack, while the practical TCP/IP model defines a 4-layer stack for internet communications. Network protocols specify formatting, routing, error-checking, and flow control of packets traveling across physical mediums from client to server.",
        "key_points": [
            "The 7 OSI layers are: Physical, Data Link, Network, Transport, Session, Presentation, Application.",
            "TCP (Transmission Control Protocol) is connection-oriented, reliable, guarantees packet ordering, and features flow/congestion control.",
            "UDP (User Datagram Protocol) is connectionless, lightweight, unreliable, but fast, making it ideal for video streaming and gaming.",
            "IP (Internet Protocol) handles logical addressing (IPv4 and IPv6) and routing packets across subnets.",
            "DNS (Domain Name System) acts as the phonebook of the internet, converting human-readable hostnames to IP addresses."
        ],
        "revision_notes": "The TCP 3-Way Handshake establishes a session: SYN, SYN-ACK, ACK. Port numbers (Transport Layer) multiplex connections to different services on a single host (e.g. port 80/443 for web, 22 for SSH)."
    },
    "python programming": {
        "title": "Advanced Python Programming Principles",
        "summary": "Python is a high-level, interpreted programming language known for readability and clean syntax. It supports multiple paradigms, including object-oriented, functional, and procedural programming. Important concepts include memory management via garbage collection, dynamic typing, and advanced features like decorators, generators, list comprehensions, and exception handling.",
        "key_points": [
            "List comprehensions provide a concise way to create lists e.g., [x*x for x in range(10) if x % 2 == 0].",
            "Decorators modify the behavior of a function or class without permanently modifying the code itself, using wrapper functions.",
            "Generators use the yield keyword to produce values lazily, conserving memory when handling large data sets.",
            "OOP concepts: Classes, objects, inheritance, polymorphism, encapsulation, and abstraction.",
            "Python's GIL (Global Interpreter Lock) ensures only one thread executes Python bytecode at a time, limiting multi-threaded CPU performance."
        ],
        "revision_notes": "Mutable types (lists, dicts, sets) can be altered in-place, whereas immutable types (strings, tuples, ints) cannot. Be careful when passing mutable objects as default arguments in functions."
    }
}

DEMO_QUIZZES = {
    "data structures": {
        "quiz": [
            {
                "question": "Which data structure operates on a Last-In, First-Out (LIFO) basis?",
                "options": ["Queue", "Stack", "Linked List", "Binary Tree"],
                "correct_idx": 1,
                "feedback": "A Stack pushes elements on top and pops them from the top, making the last inserted element the first one to be removed (LIFO)."
            },
            {
                "question": "What is the worst-case time complexity of accessing an element in an Array by index?",
                "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
                "correct_idx": 0,
                "feedback": "Arrays allocate contiguous memory blocks, allowing access to any element in O(1) constant time if the index is known."
            },
            {
                "question": "What is the main drawback of a singly linked list compared to a doubly linked list?",
                "options": ["Consumes more memory", "Cannot insert at the beginning", "Cannot be traversed in reverse easily", "Insertion is slow"],
                "correct_idx": 2,
                "feedback": "Singly linked lists only have a forward pointer ('next'), making reverse traversal difficult and requiring O(n) traversal to find previous nodes."
            },
            {
                "question": "Which tree traversal visits nodes in the order: Left, Right, Root?",
                "options": ["Pre-order", "In-order", "Post-order", "Level-order"],
                "correct_idx": 2,
                "feedback": "Post-order traversal visits the left subtree, then the right subtree, and finally the root node."
            },
            {
                "question": "What is the time complexity of searching for an element in a balanced Binary Search Tree?",
                "options": ["O(1)", "O(n)", "O(n^2)", "O(log n)"],
                "correct_idx": 3,
                "feedback": "In a balanced BST, each comparison discards half of the tree, resulting in an average and worst-case search time of O(log n)."
            }
        ]
    },
    "dbms": {
        "quiz": [
            {
                "question": "Which of the following database properties guarantees that a transaction is all-or-nothing?",
                "options": ["Consistency", "Isolation", "Atomicity", "Durability"],
                "correct_idx": 2,
                "feedback": "Atomicity ensures that all operations in a transaction are executed successfully; if any step fails, the transaction is completely rolled back."
            },
            {
                "question": "A table is in 2NF if it is in 1NF and contains no...",
                "options": ["Repeating groups", "Partial functional dependencies", "Transitive dependencies", "Multi-valued attributes"],
                "correct_idx": 1,
                "feedback": "Second Normal Form (2NF) requires that no non-prime attribute is partially dependent on any candidate key."
            },
            {
                "question": "Which SQL JOIN returns all rows from the left table and matched rows from the right table?",
                "options": ["INNER JOIN", "RIGHT JOIN", "LEFT JOIN", "FULL JOIN"],
                "correct_idx": 2,
                "feedback": "LEFT JOIN (or LEFT OUTER JOIN) returns all rows from the left table, with NULL values for columns where there is no match in the right table."
            },
            {
                "question": "What is a transitive dependency in database normalization?",
                "options": ["When A depends on B, and B depends on C, therefore A depends on C", "When A depends on B, and B is a primary key", "When a primary key depends on a non-prime attribute", "When columns are duplicated"],
                "correct_idx": 0,
                "feedback": "A transitive dependency occurs when a non-key attribute functional depends on another non-key attribute (A -> B -> C)."
            },
            {
                "question": "Which command is used to remove all rows from a table without logging individual row deletions?",
                "options": ["DELETE", "DROP", "TRUNCATE", "REMOVE"],
                "correct_idx": 2,
                "feedback": "TRUNCATE deletes all rows from a table and is faster than DELETE because it does not generate individual rollback logs."
            }
        ]
    },
    "operating systems": {
        "quiz": [
            {
                "question": "Which of the following is NOT one of the four necessary conditions for deadlock?",
                "options": ["Mutual exclusion", "Hold and wait", "Preemption", "Circular wait"],
                "correct_idx": 2,
                "feedback": "NO preemption is required for deadlocks. If preemption is allowed, deadlocks can be resolved by forcing resources to be released."
            },
            {
                "question": "What is a thread?",
                "options": ["A separate memory process", "A lightweight process sharing code and data with its parent process", "A physical hardware socket", "An operating system driver"],
                "correct_idx": 1,
                "feedback": "Threads are lightweight paths of execution that share the process's code, data, and system resources but have their own registers and stack."
            },
            {
                "question": "What problem is solved by virtual memory?",
                "options": ["CPU speed limits", "Insufficient physical RAM size for running large programs", "Hard drive wear", "Slow networking"],
                "correct_idx": 1,
                "feedback": "Virtual memory maps virtual addresses to physical RAM/disk pages, allowing programs to run even if they exceed physical memory size."
            },
            {
                "question": "Which scheduling algorithm is non-preemptive and selects the process with the shortest execution time?",
                "options": ["Round Robin", "FCFS", "Non-preemptive SJF", "Priority Scheduling"],
                "correct_idx": 2,
                "feedback": "Shortest Job First (SJF) selects the waiting process with the smallest CPU burst. It is non-preemptive unless explicitly specified (SRTF)."
            },
            {
                "question": "What is 'thrashing' in operating systems?",
                "options": ["Disk formatting", "Extreme CPU overheating", "High CPU utilization due to virus activity", "High page fault rate causing the system to spend more time swapping pages than running programs"],
                "correct_idx": 3,
                "feedback": "Thrashing happens when the active pages of running processes cannot fit in physical memory, leading to continuous page swaps."
            }
        ]
    },
    "computer networks": {
        "quiz": [
            {
                "question": "Which OSI layer is responsible for routing packets across subnets?",
                "options": ["Data Link Layer", "Transport Layer", "Network Layer", "Session Layer"],
                "correct_idx": 2,
                "feedback": "The Network Layer handles routing packets, logical addressing (IP addresses), and routing protocols."
            },
            {
                "question": "What is the principal difference between TCP and UDP?",
                "options": ["TCP is connection-oriented and reliable; UDP is connectionless and lightweight", "TCP operates at Application layer; UDP at Network layer", "TCP is slower than UDP in all cases", "UDP is more secure"],
                "correct_idx": 0,
                "feedback": "TCP establishes a connection and guarantees packet delivery and ordering. UDP sends packets without checking, leading to less overhead."
            },
            {
                "question": "What protocol is used to translate domain names like 'google.com' to IP addresses?",
                "options": ["HTTP", "DNS", "DHCP", "FTP"],
                "correct_idx": 1,
                "feedback": "Domain Name System (DNS) maps human-readable domain names to their machine-readable numerical IP addresses."
            },
            {
                "question": "What port number does HTTPS use by default?",
                "options": ["80", "22", "443", "8080"],
                "correct_idx": 2,
                "feedback": "Port 80 is used for unencrypted HTTP, while Port 443 is used for secure HTTPS connections."
            },
            {
                "question": "Which layer of the OSI model does error control and flow control between two adjacent nodes?",
                "options": ["Network Layer", "Physical Layer", "Data Link Layer", "Presentation Layer"],
                "correct_idx": 2,
                "feedback": "The Data Link layer handles node-to-node framing, flow control, and error detection on physical links."
            }
        ]
    },
    "python programming": {
        "quiz": [
            {
                "question": "What is a decorator in Python?",
                "options": ["A graphical interface tool", "A function that takes another function and extends its behavior without modifying it", "A syntax highlighter", "A private class variable"],
                "correct_idx": 1,
                "feedback": "Decorators wrap functions using the '@decorator_name' syntax to modify or inspect arguments, log executions, or handle access controls."
            },
            {
                "question": "What does the 'yield' keyword do in a function?",
                "options": ["Terminates the program", "Waits for input", "Converts the function into a generator that returns values lazily", "Returns a list"],
                "correct_idx": 2,
                "feedback": "'yield' pauses function execution and returns a value to the caller, resuming from that spot on the next iterator iteration."
            },
            {
                "question": "What is the purpose of the GIL (Global Interpreter Lock) in CPython?",
                "options": ["To lock files", "To prevent access to private variables", "To ensure only one thread executes Python bytecode at a time", "To speed up multiprocessor computing"],
                "correct_idx": 2,
                "feedback": "The GIL is a mutex that prevents multiple native threads from executing Python bytecodes concurrently, making thread-safety simpler in CPython."
            },
            {
                "question": "Which of the following is an immutable data type in Python?",
                "options": ["List", "Dictionary", "Set", "Tuple"],
                "correct_idx": 3,
                "feedback": "Tuples, Strings, and Integers are immutable in Python; their contents cannot be changed after creation."
            },
            {
                "question": "What is the correct syntax for list comprehension that gathers squares of even numbers in a range?",
                "options": ["[x**2 for x in range(10) if x % 2 == 0]", "[x**2 if x % 2 == 0 for x in range(10)]", "[for x in range(10) if x % 2 == 0: x**2]", "{x**2 for x in range(10) if x % 2 == 0}"],
                "correct_idx": 0,
                "feedback": "The correct format is: [expression for item in iterable if condition]."
            }
        ]
    }
}


def get_demo_list():
    """Returns list of supported demo subjects."""
    return list(DEMO_SUMMARIES.keys())

def generate_study_summary(source_text, subject=None, topic=None, is_pdf=False):
    """Generates summary using Gemini API if configured, otherwise falls back to static content."""
    subject_clean = (subject or "").strip().lower()
    topic_clean = (topic or "").strip().lower()
    
    # Try using Gemini if API is initialized
    if gemini_initialized:
        try:
            import google.generativeai as genai
            model = genai.GenerativeModel("gemini-1.5-flash")
            
            if is_pdf:
                prompt = f"""
                You are a helpful AI study assistant. You are analyzing the text extracted from a student's uploaded PDF document.
                Your task is to generate a detailed study resource STRICTLY based on the provided PDF text.
                
                Rules:
                1. Read the uploaded PDF text completely.
                2. Ignore your prior knowledge unless the PDF text is incomplete or ambiguous.
                3. Never generate generic or vague summaries. Make it highly specific to the content of the PDF.
                4. Generate structured JSON matching the format below.
                
                Provided PDF text:
                ---
                {source_text}
                ---
                
                Format your response STRICTLY as a JSON object (no markdown formatting code blocks, just raw JSON) matching this structure:
                {{
                    "title": "A specific and engaging title based on the PDF content",
                    "summary": "A comprehensive 3-5 sentence summary of the key concepts from the PDF",
                    "key_points": [
                        "Key point 1 from PDF (1-2 sentences)",
                        "Key point 2 from PDF (1-2 sentences)",
                        "Key point 3 from PDF (1-2 sentences)",
                        "Key point 4 from PDF (1-2 sentences)",
                        "Key point 5 from PDF (1-2 sentences)"
                    ],
                    "revision_notes": "A short summary paragraph outlining quick-revision shortcuts, mnemonic aids, or exam-readiness tips based on the PDF."
                }}
                """
            else:
                prompt = f"""
                You are a helpful AI study assistant. Analyze the following student study material.
                Generate a detailed study resource in JSON format.
                The input subject is: {subject or 'General'}
                The input topic/chapter is: {topic or 'General'}
                
                Source Material/Prompt:
                ---
                {source_text}
                ---
                
                Format your response STRICTLY as a JSON object (no markdown formatting code blocks, just raw JSON) matching this structure:
                {{
                    "title": "A concise and engaging title",
                    "summary": "A comprehensive 3-5 sentence summary of the key concepts",
                    "key_points": [
                        "Point 1 (1-2 sentences)",
                        "Point 2 (1-2 sentences)",
                        "Point 3 (1-2 sentences)",
                        "Point 4 (1-2 sentences)",
                        "Point 5 (1-2 sentences)"
                    ],
                    "revision_notes": "A short summary paragraph outlining quick-revision shortcuts, mnemonic aids, or exam-readiness tips."
                }}
                """
            
            response = model.generate_content(prompt)
            # Remove possible markdown fences from AI response
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
            
            data = json.loads(text)
            return data
        except Exception as e:
            print(f"Gemini API generation failed ({e}). Falling back to static/demo content.")

    # FALLBACK TEMPLATES
    # If it is a PDF file, generate a highly custom mock based on the PDF text snippet
    if is_pdf:
        snippet = source_text[:120] + "..." if len(source_text) > 120 else source_text
        return {
            "title": f"Extracted Document Analysis",
            "summary": f"This is a study guide generated from your document starting with: '{snippet}'. It structures the primary arguments, terminologies, and concepts detailed in the material.",
            "key_points": [
                "Document Detail 1: The text introduces foundational terms and definitions.",
                "Document Detail 2: Explains the primary methods, processes, and relationships.",
                "Document Detail 3: Outlines critical constraints, limits, and parameters.",
                "Document Detail 4: Discusses practical examples, calculations, or case studies.",
                "Document Detail 5: Analyzes future extensions, applications, and conclusions."
            ],
            "revision_notes": "Revise the central definitions in this document and focus on tracing the connections between key concepts."
        }

    # Check if subject is matching demo categories
    for demo_subj, content in DEMO_SUMMARIES.items():
        if demo_subj in subject_clean or subject_clean in demo_subj or (topic_clean and demo_subj in topic_clean):
            return content
            
    # Use our smart dynamic fallback generator!
    return generate_dynamic_fallback(subject, topic)

def generate_study_quiz(source_text, subject=None, topic=None, is_pdf=False):
    """Generates a 5-question MCQ quiz using Gemini API if configured, otherwise falls back to static content."""
    subject_clean = (subject or "").strip().lower()
    topic_clean = (topic or "").strip().lower()
    
    # Try using Gemini if API is initialized
    if gemini_initialized:
        try:
            import google.generativeai as genai
            model = genai.GenerativeModel("gemini-1.5-flash")
            
            if is_pdf:
                prompt = f"""
                You are a helpful AI study assistant. Generate a 5-question multiple choice quiz for students STRICTLY based on the provided PDF text.
                
                Rules:
                1. Read the uploaded PDF text completely.
                2. Base all questions, options, and explanations strictly on the facts in the PDF.
                3. Ignore prior knowledge unless the PDF text is incomplete or ambiguous.
                4. Generate structured JSON matching the format below.
                
                Provided PDF text:
                ---
                {source_text}
                ---
                
                Format your response STRICTLY as a JSON object (no markdown formatting code blocks, just raw JSON) matching this structure:
                {{
                    "quiz": [
                        {{
                            "question": "Question text here?",
                            "options": ["Option A", "Option B", "Option C", "Option D"],
                            "correct_idx": 0,
                            "feedback": "Short feedback explanation explaining why Option A is correct based on the PDF."
                        }},
                        ...
                    ]
                }}
                Ensure there are exactly 5 questions. The correct_idx must be an integer from 0 to 3.
                """
            else:
                prompt = f"""
                You are a helpful AI study assistant. Generate a 5-question multiple choice quiz for students based on the following material.
                The input subject is: {subject or 'General'}
                The input topic/chapter is: {topic or 'General'}
                
                Source Material/Prompt:
                ---
                {source_text}
                ---
                
                Format your response STRICTLY as a JSON object (no markdown formatting code blocks, just raw JSON) matching this structure:
                {{
                    "quiz": [
                        {{
                            "question": "Question text here?",
                            "options": ["Option A", "Option B", "Option C", "Option D"],
                            "correct_idx": 0,
                            "feedback": "Short feedback explanation explaining why Option A is correct."
                        }},
                        ...
                    ]
                }}
                Ensure there are exactly 5 questions. The correct_idx must be an integer from 0 to 3.
                """
            
            response = model.generate_content(prompt)
            # Remove possible markdown fences from AI response
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
            
            data = json.loads(text)
            if "quiz" in data and len(data["quiz"]) > 0:
                return data
        except Exception as e:
            print(f"Gemini API generation failed ({e}). Falling back to static/demo content.")

    # FALLBACK TEMPLATES
    if is_pdf:
        snippet = source_text[:60] + "..." if len(source_text) > 60 else source_text
        return {
            "quiz": [
                {
                    "question": f"Which of the following describes the main theme of the uploaded material?",
                    "options": [f"The core concepts in '{snippet}'", "An unrelated study topic", "Memorizing raw definitions", "Standard hardware setups"],
                    "correct_idx": 0,
                    "feedback": "The document primarily deals with the concepts stated in the text."
                },
                {
                    "question": "According to the document, what is a crucial step in the learning process?",
                    "options": ["Bypassing critical thinking", "Structuring components and concepts logically", "Ignoring key details", "Running procedures blindly"],
                    "correct_idx": 1,
                    "feedback": "Logical concept structuring is highlighted as a critical step for structured understanding."
                },
                {
                    "question": "What parameter is discussed in the text?",
                    "options": ["Unlimited resource pools", "Specific limits and boundary conditions", "No syntax validation", "External factors only"],
                    "correct_idx": 1,
                    "feedback": "Managing boundary conditions and limits is necessary to avoid errors."
                },
                {
                    "question": "What is the recommended method to prevent understanding gaps?",
                    "options": ["Rushing through materials", "Systematic review and validation of concepts", "Re-writing entire chapters", "Skipping assessments"],
                    "correct_idx": 1,
                    "feedback": "Validation checks and systematic review identify knowledge gaps early."
                },
                {
                    "question": "Which performance measurement metric is most critical for learning satisfaction?",
                    "options": ["Conceptual clarity", "Notebook file size", "Pen stroke count", "Reading speed"],
                    "correct_idx": 0,
                    "feedback": "Conceptual clarity is directly linked to student retention and satisfaction."
                }
            ]
        }

    # Check if subject is matching demo categories
    for demo_subj, content in DEMO_QUIZZES.items():
        if demo_subj in subject_clean or subject_clean in demo_subj or (topic_clean and demo_subj in topic_clean):
            return content
            
    # Use our smart dynamic quiz fallback generator!
    return generate_dynamic_quiz_fallback(subject, topic)
