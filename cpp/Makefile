CXX ?= g++
CXXFLAGS ?= -std=c++17 -Wall -Wextra -O2

# Detect macOS SDK if compiling on macOS
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
  SDK_PATH := /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk
  ifneq ($(wildcard $(SDK_PATH)),)
    CXXFLAGS += -isysroot $(SDK_PATH)
  endif
endif

TARGET = tracker
TEST_TARGET = tests

all: $(TARGET) $(TEST_TARGET)

$(TARGET): main.cpp
	$(CXX) $(CXXFLAGS) -o $(TARGET) main.cpp

$(TEST_TARGET): tests.cpp
	$(CXX) $(CXXFLAGS) -o $(TEST_TARGET) tests.cpp

selftest: $(TARGET)
	./$(TARGET) --selftest

bench: $(TARGET)
	./$(TARGET) --bench

test: $(TEST_TARGET)
	./$(TEST_TARGET)

clean:
	rm -f $(TARGET) $(TEST_TARGET)

.PHONY: all selftest bench test clean
