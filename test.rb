require 'selenium-webdriver'
require 'minitest/autorun'
require 'nokogiri'

class TestClimfit < MiniTest::Test
  
  describe "basics" do
    before do
      @driver = Selenium::WebDriver.for :firefox, profile: "caa"
    end
    
    it "should have correct title" do
      @driver.get "http://climateaudit.org"
      doc = Nokogiri::HTML(@driver.page_source)
      assert_equal "Climate Audit", doc.title.strip
    end
  end
end
