require 'selenium-webdriver'
require 'minitest/autorun'
require 'nokogiri'

class TestClimfit < MiniTest::Test
  
  @@driver = Selenium::WebDriver.for :firefox, profile: "caa"

  Minitest.after_run { @@driver.quit }

  describe "basics" do
    
    it "should have correct CA title" do
      @@driver.get "http://climateaudit.org"
      doc = Nokogiri::HTML(@@driver.page_source)
      assert_equal "Climate Audit", doc.title.strip
    end
    
    it "should have correct WUWT title" do
      @@driver.get(
        "http://wattsupwiththat.com/2014/07/08/record-levels-of-solar-ultraviolet-measured-in-south-america/"
      )
      doc = Nokogiri::HTML(@@driver.page_source)
      assert_equal(
        "Record levels of solar ultraviolet measured in South America | Watts Up With That?", 
        doc.title.strip
      )
    end
  end
end
