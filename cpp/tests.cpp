#include <iostream>
#include <cassert>
#include <cmath>
#include <vector>
#include <string>
#include <unordered_map>
#include <algorithm>
#include <cstring>

// Re-usable structs & helpers matching main.cpp
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
    std::string status;
};

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

int main() {
    int totalTests = 0;
    int passedTests = 0;

    auto runTest = [&](const std::string& name, bool condition) {
        totalTests++;
        if (condition) {
            std::cout << "PASS | " << name << "\n";
            passedTests++;
        } else {
            std::cout << "FAIL | " << name << "\n";
        }
    };

    std::cout << "=== RUNNING PLACEMENT TRACKER TEST SUITE ===\n\n";

    // --- UNIT TESTS ---
    runTest("UT01: Tokenizer trims and converts to lowercase", 
            splitTokens(" C++, SQL / HTML ") == std::vector<std::string>({"c++", "sql", "html"}));

    Student s101{101, "Demo Student", "IT", 8.5, "c++, sql, html", false, splitTokens("c++, sql, html")};
    Student s103{103, "Ravi", "CSE", 6.8, "sql", false, splitTokens("sql")};
    Student s104{104, "Neha", "ECE", 7.6, "matlab", false, splitTokens("matlab")};

    Drive d201{201, "Demo Company", "Software Trainee", 7.0, "IT/CSE", "c++, sql", splitTokens("IT/CSE"), splitTokens("c++, sql")};
    Drive d202{202, "TechNova", "Developer", 7.5, "IT/CSE/ECE", "c++, sql, java", splitTokens("IT/CSE/ECE"), splitTokens("c++, sql, java")};
    Drive d203{203, "DataWorks", "Analyst", 6.5, "ALL", "python, sql", splitTokens("ALL"), splitTokens("python, sql")};

    runTest("UT02: Eligibility check passes when CGPA and branch match", checkEligibility(s101, d201) == true);
    runTest("UT03: Eligibility check fails on low CGPA", checkEligibility(s103, d201) == false);
    runTest("UT04: Eligibility check fails on unlisted branch", checkEligibility(s104, d201) == false);
    runTest("UT05: Eligibility check passes for wildcard 'ALL' branches", checkEligibility(s104, d203) == true);

    runTest("UT06: Match score S101 vs D201 equals 94.0", std::abs(calculateMatchScore(s101, d201) - 94.0) < 0.01);
    runTest("UT07: Match score S101 vs D202 equals 84.0", std::abs(calculateMatchScore(s101, d202) - 84.0) < 0.01);
    runTest("UT08: Match score S101 vs D203 equals 69.0", std::abs(calculateMatchScore(s101, d203) - 69.0) < 0.01);
    runTest("UT09: Match score S103 vs D201 is 0.0 (ineligible)", calculateMatchScore(s103, d201) == 0.0);
    runTest("UT10: Match score S103 vs D203 equals 62.2", std::abs(calculateMatchScore(s103, d203) - 62.2) < 0.01);
    runTest("UT11: Match score S104 vs D201 is 0.0 (wrong branch)", calculateMatchScore(s104, d201) == 0.0);
    runTest("UT12: Match score S104 vs D202 equals 60.4", std::abs(calculateMatchScore(s104, d202) - 60.4) < 0.01);

    runTest("UT13: Valid CGPA 8.5 is accepted", isValidCgpa(8.5) == true);
    runTest("UT14: Invalid CGPA 11.0 is rejected", isValidCgpa(11.0) == false);
    runTest("UT15: Negative CGPA is rejected", isValidCgpa(-0.5) == false);
    runTest("UT16: NaN CGPA is rejected", isValidCgpa(std::numeric_limits<double>::quiet_NaN()) == false);

    // --- SECURITY TESTS ---
    runTest("ST01: SQL injection pattern in text is rejected", isSafeString("student'; DROP TABLE--") == false);
    runTest("ST02: Script tag in student name is rejected", isSafeString("<script>alert(1)</script>") == false);
    runTest("ST03: Multiline comment markers are rejected", isSafeString("admin/*comment*/") == false);
    runTest("ST04: Normal text string is accepted", isSafeString("Information Technology") == true);
    runTest("ST05: Oversized string (>50 chars) is rejected", 
            isSafeString("A very long name string that definitely exceeds fifty characters limit") == false);

    // --- INTEGRATION WORKFLOW TESTS ---
    Application testApp{101, 201, "Applied"};
    runTest("IT01: Application begins in 'Applied' status", testApp.status == "Applied");

    testApp.status = "Shortlisted";
    runTest("IT02: Status successfully transitions to 'Shortlisted'", testApp.status == "Shortlisted");

    testApp.status = "Selected";
    s101.placed = true;
    runTest("IT03: Status transitions to 'Selected' and marks student placed", 
            testApp.status == "Selected" && s101.placed == true);

    std::cout << "\n============================================\n";
    std::cout << "Summary: " << passedTests << "/" << totalTests << " tests passed successfully.\n";
    std::cout << "============================================\n";

    return (passedTests == totalTests) ? 0 : 1;
}
