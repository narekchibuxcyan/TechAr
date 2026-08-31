# Distributed under the OSI-approved BSD 3-Clause License.  See accompanying
# file Copyright.txt or https://cmake.org/licensing for details.

cmake_minimum_required(VERSION 3.5)

file(MAKE_DIRECTORY
  "/home/narek/esp/esp-idf/components/bootloader/subproject"
  "/home/narek/my-safe-website/esp32/iot-dev/build/bootloader"
  "/home/narek/my-safe-website/esp32/iot-dev/build/bootloader-prefix"
  "/home/narek/my-safe-website/esp32/iot-dev/build/bootloader-prefix/tmp"
  "/home/narek/my-safe-website/esp32/iot-dev/build/bootloader-prefix/src/bootloader-stamp"
  "/home/narek/my-safe-website/esp32/iot-dev/build/bootloader-prefix/src"
  "/home/narek/my-safe-website/esp32/iot-dev/build/bootloader-prefix/src/bootloader-stamp"
)

set(configSubDirs )
foreach(subDir IN LISTS configSubDirs)
    file(MAKE_DIRECTORY "/home/narek/my-safe-website/esp32/iot-dev/build/bootloader-prefix/src/bootloader-stamp/${subDir}")
endforeach()
if(cfgdir)
  file(MAKE_DIRECTORY "/home/narek/my-safe-website/esp32/iot-dev/build/bootloader-prefix/src/bootloader-stamp${cfgdir}") # cfgdir has leading slash
endif()
