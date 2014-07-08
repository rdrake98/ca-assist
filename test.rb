require 'selenium-webdriver'
driver = Selenium::WebDriver.for :firefox
driver.get "http://google.com"
element = driver.find_element :name => "q"
element.send_keys "Cheese!"
element.submit
puts "Page title is #{driver.title}"
