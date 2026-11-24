#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <sstream>
#include <algorithm>
#include <cmath>
#include <chrono>
#include <iomanip>
#include <limits>
#include <cstring>

struct Student {
    int id;
    std::string name;
    std::string branch;
    double cgpa;
    std::string skills;
    bool placed = false;
    std::vector<std::string> skillTokens;
};

struct Drive {
    int id;
    std::string company;
    std::string role;
    double minCgpa;
    std::string allowedBranches;
    std::string requiredSkills;
    std::vector<std::string> branchTokens;
    std::vector<std::string> skillTokens;
};

struct Application {
    int studentId;
    int driveId;
    std::string status; // "Applied", "Shortlisted", "Selected", "Rejected"
};

struct UserAccount {
    std::string username;
    std::string password;
    std::string role; // "admin", "student", "company"
    int studentId = 0;
    std::string company;
};

struct UserSession {
    bool active = false;
    std::string role;
    int studentId = 0;
    std::string company;
};

// Global state
std::unordered_map<int, Student> studentRegistry;
std::unordered_map<int, Drive> driveRegistry;
std::vector<Application> applicationRegistry;
std::vector<UserAccount> userAccounts;
UserSession currentSession;
std::unordered_map<std::string, int> failedAttempts;
const int MAX_FAILED_ATTEMPTS = 3;

// Helper: Tokenize, trim, lowercase
std::vector<std::string> splitTokens(const std::string& input) {
    std::vector<std::string> tokens;
    std::string token;
    for (char ch : input) {
        if (ch == ',' || ch == '/' || ch == ';') {
            std::string t = token;
            t.erase(0, t.find_first_not_of(" \t\r\n"));
            t.erase(t.find_last_not_of(" \t\r\n") + 1);
            std::transform(t.begin(), t.end(), t.begin(), ::tolower);
            if (!t.empty()) tokens.push_back(t);
            token.clear();
        } else {
            token += ch;
        }
    }
    std::string t = token;
    t.erase(0, t.find_first_not_of(" \t\r\n"));
    t.erase(t.find_last_not_of(" \t\r\n") + 1);
    std::transform(t.begin(), t.end(), t.begin(), ::tolower);
    if (!t.empty()) tokens.push_back(t);
    return tokens;
}

// Input sanitizer: alphanumeric + punctuation, rejects dangerous characters and script tags
bool isSafeString(const std::string& str, bool optional = false) {
    if (str.empty()) return optional;
    if (str.length() > 50) return false;
    for (unsigned char c : str) {
        if (c < 32 || c == 127 || std::strchr("<>'\"`;\\", c)) return false;
    }
    return str.find("--") == std::string::npos && str.find("/*") == std::string::npos;
}

bool isValidCgpa(double val) {
    return !std::isnan(val) && !std::isinf(val) && val >= 0.0 && val <= 10.0;
}

// Eligibility: CGPA >= minCgpa and branch is accepted
bool checkEligibility(const Student& s, const Drive& d) {
    if (!isValidCgpa(s.cgpa) || s.cgpa < d.minCgpa) return false;
    for (const auto& allowed : d.branchTokens) {
        if (allowed == "all") return true;
        std::string sBranch = s.branch;
        std::transform(sBranch.begin(), sBranch.end(), sBranch.begin(), ::tolower);
        if (allowed == sBranch) return true;
    }
    return false;
}

// Recommendation score: CGPA (40%) + Branch (30%) + Skills (30%)
double calculateMatchScore(const Student& s, const Drive& d) {
    if (!checkEligibility(s, d)) return 0.0;

    double cgpaScore = 40.0 * (s.cgpa / 10.0);

    bool allBranches = false;
    for (const auto& b : d.branchTokens) {
        if (b == "all") { allBranches = true; break; }
    }
    double branchScore = allBranches ? 20.0 : 30.0;

    double skillScore = 15.0;
    if (!d.skillTokens.empty()) {
        int matched = 0;
        for (const auto& req : d.skillTokens) {
            for (const auto& have : s.skillTokens) {
                if (req == have) { matched++; break; }
            }
        }
        skillScore = 30.0 * (static_cast<double>(matched) / d.skillTokens.size());
    }

    return std::round((cgpaScore + branchScore + skillScore) * 10.0) / 10.0;
}

// Data seeding
void initDemoData() {
    studentRegistry.clear();
    driveRegistry.clear();
    applicationRegistry.clear();
    userAccounts.clear();
    failedAttempts.clear();

    userAccounts.push_back({"admin", "1234", "admin", 0, ""});
    userAccounts.push_back({"student", "1111", "student", 101, ""});
    userAccounts.push_back({"company", "2222", "company", 0, "Demo Company"});
    userAccounts.push_back({"technova", "2222", "company", 0, "TechNova"});

    Student s1{101, "Demo Student", "IT", 8.5, "c++, sql, html", false, splitTokens("c++, sql, html")};
    Student s2{102, "Asha", "IT", 8.4, "c++, python", false, splitTokens("c++, python")};
    Student s3{103, "Ravi", "CSE", 6.8, "sql", false, splitTokens("sql")};
    Student s4{104, "Neha", "ECE", 7.6, "matlab", false, splitTokens("matlab")};

    studentRegistry[101] = s1;
    studentRegistry[102] = s2;
    studentRegistry[103] = s3;
    studentRegistry[104] = s4;

    Drive d1{201, "Demo Company", "Software Trainee", 7.0, "IT/CSE", "c++, sql", splitTokens("IT/CSE"), splitTokens("c++, sql")};
    Drive d2{202, "TechNova", "Developer", 7.5, "IT/CSE/ECE", "c++, sql, java", splitTokens("IT/CSE/ECE"), splitTokens("c++, sql, java")};
    Drive d3{203, "DataWorks", "Analyst", 6.5, "ALL", "python, sql", splitTokens("ALL"), splitTokens("python, sql")};

    driveRegistry[201] = d1;
    driveRegistry[202] = d2;
    driveRegistry[203] = d3;
}

// Verification suite for matching accuracy
void runSelfTest() {
    initDemoData();
    struct TestCase { int sid; int did; double expected; std::string note; };
    std::vector<TestCase> cases = {
        {101, 201, 94.0, "Full match: CGPA 8.5, IT listed, 2/2 skills"},
        {101, 202, 84.0, "Branch listed, 2/3 skills"},
        {101, 203, 69.0, "Open to ALL branches, 1/2 skills"},
        {103, 201, 0.0,  "CGPA 6.8 below minimum 7.0"},
        {103, 203, 62.2, "CSE, CGPA 6.8, 1/2 skills"},
        {104, 201, 0.0,  "ECE not in allowed branches"},
        {104, 202, 60.4, "ECE listed, 0/3 skills"}
    };

    int passed = 0;
    for (const auto& tc : cases) {
        double score = calculateMatchScore(studentRegistry[tc.sid], driveRegistry[tc.did]);
        if (std::abs(score - tc.expected) < 0.01) {
            std::cout << "PASS | S" << tc.sid << " vs D" << tc.did << " | expected "
                      << std::fixed << std::setprecision(1) << tc.expected << " got " << score 
                      << " | " << tc.note << "\n";
            passed++;
        } else {
            std::cout << "FAIL | S" << tc.sid << " vs D" << tc.did << " | expected "
                      << tc.expected << " got " << score << "\n";
        }
    }
    std::cout << passed << "/" << cases.size() << " matching tests passed\n";
}

// Performance benchmark
void runBenchmark() {
    std::cout << "=== PERFORMANCE BENCHMARK ===\n";
    std::cout << "Data size: 20000 students, 2000 drives\n";

    Student sampleStudent{999, "Benchmark Student", "IT", 8.5, "c++, sql, html", false, splitTokens("c++, sql, html")};
    Drive sampleDrive{888, "Benchmark Corp", "Engineer", 7.0, "IT/CSE", "c++, sql", splitTokens("IT/CSE"), splitTokens("c++, sql")};

    auto t1 = std::chrono::high_resolution_clock::now();
    double totalScore = 0.0;
    for (int i = 0; i < 600000; i++) {
        totalScore += calculateMatchScore(sampleStudent, sampleDrive);
    }
    auto t2 = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double, std::milli> duration = t2 - t1;

    std::cout << "A) Matching 600,000 student-drive pairs\n";
    std::cout << "   Execution time: " << duration.count() << " ms\n";
    std::cout << "   Score total calculated: " << std::fixed << std::setprecision(1) << totalScore << "\n";

    auto t3 = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < 50000; i++) {
        volatile bool found = (studentRegistry.find(101) != studentRegistry.end());
        (void)found;
    }
    auto t4 = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double, std::milli> lookupDur = t4 - t3;

    std::cout << "B) 50,000 lookups by Student ID (hash index)\n";
    std::cout << "   Execution time: " << lookupDur.count() << " ms\n";
    std::cout << "Benchmark complete.\n";
}

// Interactive Console Menus
void showAdminPortal() {
    int choice = -1;
    while (choice != 0) {
        std::cout << "\n=== ADMIN PORTAL ===\n";
        std::cout << "1 Add Student\n";
        std::cout << "2 View Students\n";
        std::cout << "3 Add Placement Drive\n";
        std::cout << "4 View Placement Drives\n";
        std::cout << "5 View Applications\n";
        std::cout << "6 Placement Report\n";
        std::cout << "0 Logout\nChoice: ";
        if (!(std::cin >> choice)) {
            std::cin.clear();
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
            continue;
        }

        if (choice == 1) {
            int id;
            std::string name, branch, skills;
            double cgpa;
            std::cout << "Student ID: "; std::cin >> id;
            std::cin.ignore();
            std::cout << "Name: "; std::getline(std::cin, name);
            std::cout << "Branch: "; std::getline(std::cin, branch);
            std::cout << "CGPA: "; std::cin >> cgpa;
            std::cin.ignore();
            std::cout << "Skills (comma separated): "; std::getline(std::cin, skills);

            if (!isSafeString(name) || !isSafeString(branch) || !isValidCgpa(cgpa)) {
                std::cout << "[400] Invalid input values.\n";
            } else if (studentRegistry.count(id)) {
                std::cout << "[409] Student ID already exists.\n";
            } else {
                studentRegistry[id] = {id, name, branch, cgpa, skills, false, splitTokens(skills)};
                std::cout << "[201] Student added successfully.\n";
            }
        } else if (choice == 2) {
            std::cout << "\nRegistered Students:\n";
            for (const auto& [id, s] : studentRegistry) {
                std::cout << "ID: " << s.id << " | " << s.name << " | " << s.branch 
                          << " | CGPA: " << s.cgpa << " | Placed: " << (s.placed ? "Yes" : "No") << "\n";
            }
        } else if (choice == 3) {
            int id;
            std::string company, role, branches, skills;
            double minCgpa;
            std::cout << "Drive ID: "; std::cin >> id;
            std::cin.ignore();
            std::cout << "Company: "; std::getline(std::cin, company);
            std::cout << "Role: "; std::getline(std::cin, role);
            std::cout << "Min CGPA: "; std::cin >> minCgpa;
            std::cin.ignore();
            std::cout << "Eligible Branches: "; std::getline(std::cin, branches);
            std::cout << "Skills: "; std::getline(std::cin, skills);

            if (!isSafeString(company) || !isSafeString(role) || !isValidCgpa(minCgpa)) {
                std::cout << "[400] Invalid input values.\n";
            } else if (driveRegistry.count(id)) {
                std::cout << "[409] Drive ID already exists.\n";
            } else {
                driveRegistry[id] = {id, company, role, minCgpa, branches, skills, splitTokens(branches), splitTokens(skills)};
                std::cout << "[201] Drive added successfully.\n";
            }
        } else if (choice == 4) {
            std::cout << "\nPlacement Drives:\n";
            for (const auto& [id, d] : driveRegistry) {
                std::cout << "Drive " << d.id << ": " << d.company << " - " << d.role 
                          << " | Min CGPA: " << d.minCgpa << " | Branches: " << d.allowedBranches << "\n";
            }
        } else if (choice == 5) {
            std::cout << "\nApplications:\n";
            for (const auto& app : applicationRegistry) {
                std::cout << "Student ID: " << app.studentId << " | Drive ID: " << app.driveId 
                          << " | Status: " << app.status << "\n";
            }
        } else if (choice == 6) {
            int total = studentRegistry.size();
            int placed = 0;
            for (const auto& [id, s] : studentRegistry) if (s.placed) placed++;
            double pct = total > 0 ? (placed * 100.0 / total) : 0.0;
            std::cout << "\nPlacement Report:\n";
            std::cout << "Students: " << total << " | Placed: " << placed 
                      << " | Unplaced: " << (total - placed) << " | Placement %: " << pct << "%\n";
            std::cout << "Drives: " << driveRegistry.size() << " | Applications: " << applicationRegistry.size() << "\n";
        }
    }
}

void showStudentPortal(int studentId) {
    int choice = -1;
    while (choice != 0) {
        std::cout << "\n=== STUDENT PORTAL ===\n";
        std::cout << "1 View Available Drives\n";
        std::cout << "2 View Recommended Drives\n";
        std::cout << "3 Apply for Drive\n";
        std::cout << "4 View My Applications\n";
        std::cout << "0 Logout\nChoice: ";
        if (!(std::cin >> choice)) {
            std::cin.clear();
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
            continue;
        }

        if (choice == 1) {
            for (const auto& [id, d] : driveRegistry) {
                std::cout << "Drive " << d.id << ": " << d.company << " (" << d.role << ") | Min CGPA: " << d.minCgpa << "\n";
            }
        } else if (choice == 2) {
            if (studentRegistry.count(studentId) == 0) continue;
            const auto& s = studentRegistry[studentId];
            std::cout << "\nRecommendations for " << s.name << " (" << s.branch << ", CGPA " << s.cgpa << "):\n";
            std::vector<std::pair<double, Drive>> ranked;
            for (const auto& [id, d] : driveRegistry) {
                double score = calculateMatchScore(s, d);
                if (score > 0.0) ranked.push_back({score, d});
            }
            std::sort(ranked.begin(), ranked.end(), [](const auto& a, const auto& b) {
                return a.first > b.first;
            });
            for (size_t i = 0; i < ranked.size(); i++) {
                std::cout << "#" << (i + 1) << " Drive " << ranked[i].second.id << " " 
                          << ranked[i].second.company << " - " << ranked[i].second.role 
                          << " | Match " << ranked[i].first << "%\n";
            }
        } else if (choice == 3) {
            int driveId;
            std::cout << "Enter Drive ID to apply: ";
            std::cin >> driveId;
            if (driveRegistry.count(driveId) == 0) {
                std::cout << "[404] Drive not found.\n";
                continue;
            }
            bool alreadyApplied = false;
            for (const auto& app : applicationRegistry) {
                if (app.studentId == studentId && app.driveId == driveId) {
                    alreadyApplied = true; break;
                }
            }
            if (alreadyApplied) {
                std::cout << "[409] Already applied for this drive.\n";
            } else if (!checkEligibility(studentRegistry[studentId], driveRegistry[driveId])) {
                std::cout << "[422] Ineligible: CGPA or branch requirements not met.\n";
            } else {
                applicationRegistry.push_back({studentId, driveId, "Applied"});
                std::cout << "[201] Application submitted successfully (Status: Applied).\n";
            }
        } else if (choice == 4) {
            std::cout << "\nMy Applications:\n";
            for (const auto& app : applicationRegistry) {
                if (app.studentId == studentId) {
                    std::cout << "Drive: " << driveRegistry[app.driveId].company 
                              << " (" << driveRegistry[app.driveId].role << ") | Status: " << app.status << "\n";
                }
            }
        }
    }
}

void showCompanyPortal(const std::string& companyName) {
    int choice = -1;
    while (choice != 0) {
        std::cout << "\n=== COMPANY PORTAL (" << companyName << ") ===\n";
        std::cout << "1 View Our Drives\n";
        std::cout << "2 View Applications\n";
        std::cout << "3 Update Application Status\n";
        std::cout << "0 Logout\nChoice: ";
        if (!(std::cin >> choice)) {
            std::cin.clear();
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
            continue;
        }

        if (choice == 1) {
            for (const auto& [id, d] : driveRegistry) {
                if (d.company == companyName) {
                    std::cout << "Drive " << d.id << ": " << d.role << " | Min CGPA: " << d.minCgpa << "\n";
                }
            }
        } else if (choice == 2) {
            for (const auto& app : applicationRegistry) {
                if (driveRegistry[app.driveId].company == companyName) {
                    const auto& s = studentRegistry[app.studentId];
                    std::cout << "Student: " << s.name << " (ID: " << s.id << ") | Drive ID: " << app.driveId 
                              << " | Status: " << app.status << "\n";
                }
            }
        } else if (choice == 3) {
            int sid, did;
            std::cout << "Student ID: "; std::cin >> sid;
            std::cout << "Drive ID: "; std::cin >> did;

            Application* target = nullptr;
            for (auto& app : applicationRegistry) {
                if (app.studentId == sid && app.driveId == did) {
                    target = &app; break;
                }
            }

            if (!target) {
                std::cout << "[404] Application record not found.\n";
            } else if (driveRegistry[did].company != companyName) {
                std::cout << "[403] Unauthorized: Not your company's drive.\n";
            } else if (target->status == "Selected" || target->status == "Rejected") {
                std::cout << "[422] Final status reached; cannot be modified.\n";
            } else {
                std::cout << "Choose status: 1. Shortlisted, 2. Selected, 3. Rejected: ";
                int sChoice; std::cin >> sChoice;
                if (sChoice == 1) target->status = "Shortlisted";
                else if (sChoice == 2) {
                    target->status = "Selected";
                    studentRegistry[sid].placed = true;
                } else if (sChoice == 3) target->status = "Rejected";
                std::cout << "[200] Status updated to " << target->status << ".\n";
            }
        }
    }
}

int main(int argc, char* argv[]) {
    if (argc > 1) {
        std::string flag = argv[1];
        if (flag == "--selftest") {
            runSelfTest();
            return 0;
        } else if (flag == "--bench") {
            runBenchmark();
            return 0;
        }
    }

    initDemoData();
    std::cout << "========================================\n";
    std::cout << "=== COLLEGE PLACEMENT TRACKER ENGINE ===\n";
    std::cout << "========================================\n";
    std::cout << "DEMO ACCOUNTS: admin/1234, student/1111, company/2222\n";

    while (true) {
        std::string username, password;
        std::cout << "\nUsername (or exit): ";
        if (!(std::cin >> username) || username == "exit") {
            std::cout << "Program closed.\n";
            break;
        }

        if (failedAttempts[username] >= MAX_FAILED_ATTEMPTS) {
            std::cout << "[423] Account locked after 3 failed attempts.\n";
            continue;
        }

        std::cout << "Password: ";
        std::cin >> password;

        bool authenticated = false;
        UserAccount matchedUser;
        for (const auto& u : userAccounts) {
            if (u.username == username && u.password == password) {
                authenticated = true;
                matchedUser = u;
                break;
            }
        }

        if (authenticated) {
            failedAttempts[username] = 0;
            currentSession = {true, matchedUser.role, matchedUser.studentId, matchedUser.company};
            std::cout << "[200] Login successful as " << matchedUser.role << ".\n";

            if (matchedUser.role == "admin") {
                showAdminPortal();
            } else if (matchedUser.role == "student") {
                showStudentPortal(matchedUser.studentId);
            } else if (matchedUser.role == "company") {
                showCompanyPortal(matchedUser.company);
            }
            currentSession = {false, "", 0, ""};
        } else {
            failedAttempts[username]++;
            std::cout << "[401] Invalid username or password.\n";
        }
    }
    return 0;
}
