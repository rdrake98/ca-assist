require 'selenium-webdriver'
require 'minitest/autorun'
require 'nokogiri'
require 'pry'

class TestClimfit < MiniTest::Test
  
  @@driver = Selenium::WebDriver.for :firefox, profile: "climfit"

  Minitest.after_run { @@driver.quit }
  
  def self.get_noko(url)
    @@driver.get url
    Nokogiri::HTML @@driver.page_source
  end

  describe "CE" do
    
    @@ce = TestClimfit.get_noko "http://judithcurry.com/2014/07/06/phunny-physics/"

    it "should have correct title" do 
      assert_equal "Phunny Physics | Climate Etc.", @@ce.title.strip
    end

    it "should have all comments coloured" do 
      comments = @@ce.css '.highlander-comment'
      coloured = comments.css '.cmtOld,.cmtNorm,.cmtNew'
      assert_equal comments.size, coloured.size
    end
  end

end
