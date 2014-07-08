require 'selenium-webdriver'
require 'minitest/autorun'

class TestClimfit < MiniTest::Test
  
  describe "basics" do
    before do
      @driver = Selenium::WebDriver.for :firefox, profile: "caa"
    end
    
    it "should have correct title" do
      @driver.get "http://climateaudit.org"
      assert_equal "Climate Audit", @driver.title
    end
  end
end
