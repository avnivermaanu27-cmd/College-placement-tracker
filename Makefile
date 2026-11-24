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

all: $(TARGET)

$(TARGET): main.cpp
	$(CXX) $(CXXFLAGS) -o $(TARGET) main.cpp

run: $(TARGET)
	./$(TARGET)

selftest: $(TARGET)
	./$(TARGET) --selftest

bench: $(TARGET)
	./$(TARGET) --bench

clean:
	rm -f $(TARGET)
	$(MAKE) -C cpp clean

.PHONY: all run selftest bench clean
