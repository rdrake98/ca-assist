require 'selenium-webdriver'
driver = Selenium::WebDriver.for :firefox
driver.get "http://climateaudit.org"
puts "Page title is #{driver.title}"
