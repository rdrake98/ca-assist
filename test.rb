require 'selenium-webdriver'
require 'minitest/autorun'
require 'nokogiri'

class TestClimfit < MiniTest::Test
  
  describe "basics" do
    before do
      @driver = Selenium::WebDriver.for :firefox, profile: "caa"
    end
    
    after do
      # @driver.quit
    end
    
    it "should have correct title" do
      @driver.get "http://climateaudit.org"
      doc = Nokogiri::HTML(@driver.page_source)
      assert_equal "Climate Audit", doc.title.strip
      @driver.get(
        "http://wattsupwiththat.com/2014/07/08/record-levels-of-solar-ultraviolet-measured-in-south-america/"
      )
    end
  end
end
