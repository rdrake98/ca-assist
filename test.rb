require 'selenium-webdriver'
require 'minitest/autorun'
require 'nokogiri'

class TestClimfit < MiniTest::Test
  
  @@driver = Selenium::WebDriver.for :firefox, profile: "caa"

  Minitest.after_run { @@driver.quit }
  
  def self.get_noko(url)
    puts
    puts url
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
    
    before do
      @doc ||= TestClimfit.get_noko(
        "http://wattsupwiththat.com/2014/07/08/record-levels-of-solar-ultraviolet-measured-in-south-america/"
      )
    end

    after do
      @doc = nil
    end

    it "should have correct title" do 
      assert_equal(
        "Record levels of solar ultraviolet measured in South America | Watts Up With That?", 
        @doc.title.strip
      )
    end

    it "should have comments" do 
      comments = @doc.css '.highlander-comment'
      assert_equal nil, comments.size
    end
  end

  describe "Local" do
    
    before do
      @doc = TestClimfit.get_noko "file:///Users/richarddrake/web/climfit/CE4.html"
    end

    it "should have title" do 
      assert_equal nil, @doc.title.strip
    end

    it "should have comments" do 
      comments = @doc.css '.highlander-comment'
      assert_equal nil, comments.size
    end
  end
end
