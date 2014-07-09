require 'selenium-webdriver'
require 'minitest/autorun'
require 'nokogiri'

class TestClimfit < MiniTest::Test
  
  @@fetches = 0
  
  @@driver = Selenium::WebDriver.for :firefox, profile: "caa"

  Minitest.after_run { @@driver.quit }
  
  def self.get_noko(url)
    puts
    puts "fetch #{@@fetches += 1}: #{url}"
    @@driver.get url
    Nokogiri::HTML @@driver.page_source
  end

  describe "CA" do
    it "should have correct title" do
      doc = TestClimfit.get_noko "http://climateaudit.org/"
      assert_equal "Climate Audit", doc.title.strip
    end
  end
    
  describe "WUWT" do
    
    @@wuwt = TestClimfit.get_noko(
      "http://wattsupwiththat.com/2014/07/08/record-levels-of-solar-ultraviolet-measured-in-south-america/"
    )

    it "should have correct title" do 
      assert_equal(
        "Record levels of solar ultraviolet measured in South America | Watts Up With That?", 
        @@wuwt.title.strip
      )
    end

    it "should have comments" do 
      comments = @@wuwt.css '.highlander-comment'
      assert_equal nil, comments.size
    end
  end

  describe "Local" do
    
    @@ce4 = TestClimfit.get_noko "file:///Users/richarddrake/web/climfit/CE4.html"

    it "should have correct title" do 
      assert_equal "Selection bias in climate model simulations | Climate Etc.", @@ce4.title.strip
    end

    it "should have comments" do 
      comments = @@ce4.css '.highlander-comment'
      assert_equal nil, comments.size
    end
  end
end
