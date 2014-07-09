require 'selenium-webdriver'
require 'minitest/autorun'
require 'nokogiri'

class TestClimfit < MiniTest::Test
  
  @@driver = Selenium::WebDriver.for :firefox, profile: "caa"

  Minitest.after_run { @@driver.quit }
  
  def self.get_noko(url)
    @@driver.get url
    Nokogiri::HTML @@driver.page_source
  end

  describe "CA" do
    
    it "should have correct title" do
      doc = TestClimfit.get_noko "http://climateaudit.org"
      assert_equal "Climate Audit", doc.title.strip
    end
    
  end
    
  describe "WUWT" do
    
    it "should have correct title" do
      doc = TestClimfit.get_noko(
        "http://wattsupwiththat.com/2014/07/08/record-levels-of-solar-ultraviolet-measured-in-south-america/"
      )
      assert_equal(
        "Record levels of solar ultraviolet measured in South America | Watts Up With That?", 
        doc.title.strip
      )
    end
  end
end
